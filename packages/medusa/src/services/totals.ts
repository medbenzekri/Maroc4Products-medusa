import { isDefined, MedusaError } from "@medusajs/utils"
import { EntityManager } from "typeorm"
import {
    ITaxCalculationStrategy,
    TaxCalculationContext,
    TransactionBaseService,
} from "../interfaces"
import {
    Cart,
    ClaimOrder,
    Discount,
    DiscountRuleType,
    LineItem,
    LineItemTaxLine,
    Order,
    ShippingMethod,
    ShippingMethodTaxLine,
    Swap,
} from "../models"
import { isCart } from "../types/cart"
import { isOrder } from "../types/orders"
import {
    CalculationContextData,
    LineAllocationsMap,
    LineDiscount,
    LineDiscountAmount,
    SubtotalOptions,
} from "../types/totals"
import { NewTotalsService, TaxProviderService } from "./index"

import { FlagRouter } from "@medusajs/utils"
import TaxInclusivePricingFeatureFlag from "../loaders/feature-flags/tax-inclusive-pricing"
import { calculatePriceTaxAmount } from "../utils"

type ShippingMethodTotals = {
  price: number
  tax_total: number
  total: number
  subtotal: number
  original_total: number
  original_tax_total: number
  tax_lines: ShippingMethodTaxLine[]
}

type GetShippingMethodTotalsOptions = {
  include_tax?: boolean
  use_tax_lines?: boolean
  calculation_context?: TaxCalculationContext
}

type LineItemTotals = {
  unit_price: number
  quantity: number
  subtotal: number
  tax_total: number
  total: number
  original_total: number
  original_tax_total: number
  tax_lines: LineItemTaxLine[]
  discount_total: number

  raw_discount_total: number
}

type LineItemTotalsOptions = {
  include_tax?: boolean
  use_tax_lines?: boolean
  exclude_gift_cards?: boolean
  calculation_context?: TaxCalculationContext
}

type GetLineItemTotalOptions = {
  include_tax?: boolean
  exclude_discounts?: boolean
}

type TotalsServiceProps = {
  taxProviderService: TaxProviderService
  newTotalsService: NewTotalsService
  taxCalculationStrategy: ITaxCalculationStrategy
  manager: EntityManager
  featureFlagRouter: FlagRouter
}

type GetTotalsOptions = {
  exclude_gift_cards?: boolean
  force_taxes?: boolean
}

type AllocationMapOptions = {
  exclude_gift_cards?: boolean
  exclude_discounts?: boolean
}

type CalculationContextOptions = {
  is_return?: boolean
  exclude_shipping?: boolean
  exclude_gift_cards?: boolean
  exclude_discounts?: boolean
}

/**
 * A service that calculates total and subtotals for orders, carts etc..
 * @implements {BaseService}
 */
class TotalsService extends TransactionBaseService {
  protected readonly taxProviderService_: TaxProviderService
  protected readonly newTotalsService_: NewTotalsService
  protected readonly taxCalculationStrategy_: ITaxCalculationStrategy
  protected readonly featureFlagRouter_: FlagRouter

  constructor({
    taxProviderService,
    newTotalsService,
    taxCalculationStrategy,
    featureFlagRouter,
  }: TotalsServiceProps) {
    // eslint-disable-next-line prefer-rest-params
    super(arguments[0])

    this.taxProviderService_ = taxProviderService
    this.newTotalsService_ = newTotalsService
    this.taxCalculationStrategy_ = taxCalculationStrategy

    this.featureFlagRouter_ = featureFlagRouter
  }

  /**
   * Calculates total of a given cart or order.
   * @param cartOrOrder - object to calculate total for
   * @param options - options to calculate by
   * @return the calculated subtotal
   */
  async getTotal(
    cartOrOrder: Cart | Order,
    options: GetTotalsOptions = {}
  ): Promise<number> {
    const subtotal = await this.getSubtotal(cartOrOrder)
    const taxTotal =
      (await this.getTaxTotal(cartOrOrder, options.force_taxes)) || 0
    const discountTotal = await this.getDiscountTotal(cartOrOrder)
    const giftCardTotal = options.exclude_gift_cards
      ? { total: 0 }
      : await this.getGiftCardTotal(cartOrOrder)
    const shippingTotal = await this.getShippingTotal(cartOrOrder)

    return (
      subtotal + taxTotal + shippingTotal - discountTotal - giftCardTotal.total
    )
  }

  /**
   * Gets the total payments made on an order
   * @param order - the order to calculate paid amount for
   * @return the total paid amount
   */
  getPaidTotal(order: Order): number {
    const total = order.payments?.reduce((acc, next) => {
      acc += next.amount
      return acc
    }, 0)

    return total
  }

  /**
   * The total paid for swaps. May be negative in case of negative swap
   * difference.
   * @param order - the order to calculate swap total for
   * @return the swap total
   */
  getSwapTotal(order: Order): number {
    let swapTotal = 0
    if (order.swaps && order.swaps.length) {
      for (const s of order.swaps) {
        swapTotal = swapTotal + s.difference_due
      }
    }

    return swapTotal
  }

  /**
   * Gets the totals breakdown for a shipping method. Fetches tax lines if not
   * already provided.
   * @param shippingMethod - the shipping method to get totals breakdown for.
   * @param cartOrOrder - the cart or order to use as context for the breakdown
   * @param opts - options for what should be included
   * @returns An object that breaks down the totals for the shipping method
   */
  async getShippingMethodTotals(
    shippingMethod: ShippingMethod,
    cartOrOrder: Cart | Order,
    opts: GetShippingMethodTotalsOptions = {}
  ): Promise<ShippingMethodTotals> {
    const calculationContext =
      opts.calculation_context ||
      (await this.getCalculationContext(cartOrOrder, {
        exclude_shipping: true,
      }))
    calculationContext.shipping_methods = [shippingMethod]

    const totals = {
      price: shippingMethod.price,
      original_total: shippingMethod.price,
      total: shippingMethod.price,
      subtotal: shippingMethod.price,
      original_tax_total: 0,
      tax_total: 0,
      tax_lines: shippingMethod.tax_lines || [],
    }

    if (opts.include_tax) {
      if (isOrder(cartOrOrder) && cartOrOrder.tax_rate != null) {
        totals.original_tax_total = Math.round(
          totals.price * (cartOrOrder.tax_rate / 100)
        )
        totals.tax_total = Math.round(
          totals.price * (cartOrOrder.tax_rate / 100)
        )
      } else if (totals.tax_lines.length === 0) {
        const orderLines = await this.taxProviderService_
          .withTransaction(this.activeManager_)
          .getTaxLines(cartOrOrder.items, calculationContext)

        totals.tax_lines = orderLines.filter((ol) => {
          if ("shipping_method_id" in ol) {
            return ol.shipping_method_id === shippingMethod.id
          }
          return false
        }) as ShippingMethodTaxLine[]

        if (totals.tax_lines.length === 0 && isOrder(cartOrOrder)) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Tax Lines must be joined on shipping method to calculate taxes"
          )
        }
      }

      if (totals.tax_lines.length > 0) {
        const includesTax =
          this.featureFlagRouter_.isFeatureEnabled(
            TaxInclusivePricingFeatureFlag.key
          ) && shippingMethod.includes_tax

        totals.original_tax_total =
          await this.taxCalculationStrategy_.calculate(
            [],
            totals.tax_lines,
            calculationContext
          )
        totals.tax_total = totals.original_tax_total

        if (includesTax) {
          totals.subtotal -= totals.tax_total
        } else {
          totals.original_total += totals.original_tax_total
          totals.total += totals.tax_total
        }
      }
    }

    const hasFreeShipping = cartOrOrder.discounts?.some(
      (d) => d.rule.type === DiscountRuleType.FREE_SHIPPING
    )

    if (hasFreeShipping) {
      totals.total = 0
      totals.subtotal = 0
      totals.tax_total = 0
    }

    return totals
  }

  /**
   * Calculates subtotal of a given cart or order.
   * @param cartOrOrder - cart or order to calculate subtotal for
   * @param opts - options
   * @return the calculated subtotal
   */
  async getSubtotal(
    cartOrOrder: Cart | Order,
    opts: SubtotalOptions = {}
  ): Promise<number> {
    let subtotal = 0
    if (!cartOrOrder.items) {
      return subtotal
    }

    const getLineItemSubtotal = async (item: LineItem): Promise<number> => {
      const totals = await this.getLineItemTotals(item, cartOrOrder, {
        include_tax: true,
        exclude_gift_cards: true,
      })
      return totals.subtotal
    }

    for (const item of cartOrOrder.items) {
      if (opts.excludeNonDiscounts) {
        if (item.allow_discounts) {
          subtotal += await getLineItemSubtotal(item)
        }
        continue
      }

      subtotal += await getLineItemSubtotal(item)
    }

    return this.rounded(subtotal)
  }

  /**
   * Calculates shipping total
   * @param cartOrOrder - cart or order to calculate subtotal for
   * @return shipping total
   */
  async getShippingTotal(cartOrOrder: Cart | Order): Promise<number> {
    const { shipping_methods } = cartOrOrder

    let total = 0
    for (const shippingMethod of shipping_methods) {
      const totals = await this.getShippingMethodTotals(
        shippingMethod,
        cartOrOrder,
        {
          include_tax: true,
        }
      )

      total += totals.subtotal
    }

    return total
  }

  /**
   * Calculates tax total
   * Currently based on the Danish tax system
   * @param cartOrOrder - cart or order to calculate tax total for
   * @param forceTaxes - whether taxes should be calculated regardless
   *   of region settings
   * @return tax total
   */
  async getTaxTotal(
    cartOrOrder: Cart | Order,
    forceTaxes = false
  ): Promise<number | null> {
    if (
      isCart(cartOrOrder) &&
      !forceTaxes &&
      !cartOrOrder.region.automatic_taxes
    ) {
      return null
    }

    const calculationContext = await this.getCalculationContext(cartOrOrder)
    const giftCardTotal = await this.getGiftCardTotal(cartOrOrder)

    let taxLines: (ShippingMethodTaxLine | LineItemTaxLine)[]
    if (isOrder(cartOrOrder)) {
      const taxLinesJoined = cartOrOrder.items.every((i) =>
        isDefined(i.tax_lines)
      )
      if (!taxLinesJoined) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Order tax calculations must have tax lines joined on line items"
        )
      }

      if (cartOrOrder.tax_rate === null) {
        taxLines = cartOrOrder.items.flatMap((li) => li.tax_lines)

        const shippingTaxLines = cartOrOrder.shipping_methods.flatMap(
          (sm) => sm.tax_lines
        )

        taxLines = taxLines.concat(shippingTaxLines)
      } else {
        const subtotal = await this.getSubtotal(cartOrOrder)
        const shippingTotal = await this.getShippingTotal(cartOrOrder)
        const discountTotal = await this.getDiscountTotal(cartOrOrder)
        return this.rounded(
          (subtotal - discountTotal - giftCardTotal.total + shippingTotal) *
            (cartOrOrder.tax_rate / 100)
        )
      }
    } else {
      taxLines = await this.taxProviderService_
        .withTransaction(this.activeManager_)
        .getTaxLines(cartOrOrder.items, calculationContext)

      if (cartOrOrder.type === "swap") {
        const returnTaxLines = cartOrOrder.items.flatMap((i) => {
          if (i.is_return) {
            if (typeof i.tax_lines === "undefined") {
              throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                "Return Line Items must join tax lines"
              )
            }
            return i.tax_lines
          }

          return []
        })

        taxLines = taxLines.concat(returnTaxLines)
      }
    }

    const toReturn = await this.taxCalculationStrategy_.calculate(
      cartOrOrder.items,
      taxLines,
      calculationContext
    )

    if (cartOrOrder.region.gift_cards_taxable) {
      return this.rounded(toReturn - giftCardTotal.tax_total)
    }

    return this.rounded(toReturn)
  }

  /**
   * Gets a map of discounts and gift cards that apply to line items in an
   * order. The function calculates the amount of a discount or gift card that
   * applies to a specific line item.
   * @param orderOrCart - the order or cart to get an allocation map for
   * @param options - controls what should be included in allocation map
   * @return the allocation map for the line items in the cart or order.
   */
  async getAllocationMap(
    orderOrCart: {
      discounts?: Discount[]
      items: LineItem[]
      swaps?: Swap[]
      claims?: ClaimOrder[]
    },
    options: AllocationMapOptions = {}
  ): Promise<LineAllocationsMap> {
    const allocationMap: LineAllocationsMap = {}

    if (!options.exclude_discounts) {
      const discount = orderOrCart.discounts?.find(
        ({ rule }) => rule.type !== DiscountRuleType.FREE_SHIPPING
      )

      const lineDiscounts: LineDiscountAmount[] = this.getLineDiscounts(
        orderOrCart,
        discount
      )

      for (const ld of lineDiscounts) {
        const adjustmentAmount = ld.amount + ld.customAdjustmentsAmount

        if (allocationMap[ld.item.id]) {
          allocationMap[ld.item.id].discount = {
            amount: adjustmentAmount,
            /**
             * Used for the refund computation
             */
            unit_amount: adjustmentAmount / ld.item.quantity,
          }
        } else {
          allocationMap[ld.item.id] = {
            discount: {
              amount: adjustmentAmount,
              /**
               * Used for the refund computation
               */
              unit_amount: Math.round(adjustmentAmount / ld.item.quantity),
            },
          }
        }
      }
    }

    return allocationMap
  }

  /**
   * Gets the total refund amount for an order.
   * @param order - the order to get total refund amount for.
   * @return the total refunded amount for an order.
   */
  getRefundedTotal(order: Order): number {
    if (!order.refunds) {
      return 0
    }

    const total = order.refunds.reduce((acc, next) => acc + next.amount, 0)
    return this.rounded(total)
  }

  /**
   * The amount that can be refunded for a given line item.
   * @param order - order to use as context for the calculation
   * @param lineItem - the line item to calculate the refund amount for.
   * @return the line item refund amount.
   */
  async getLineItemRefund(order: Order, lineItem: LineItem): Promise<number> {
    const allocationMap = await this.getAllocationMap(order)

    const includesTax =
      this.featureFlagRouter_.isFeatureEnabled(
        TaxInclusivePricingFeatureFlag.key
      ) && lineItem.includes_tax

    const discountAmount =
      (allocationMap[lineItem.id]?.discount?.unit_amount || 0) *
      lineItem.quantity

    let lineSubtotal = lineItem.unit_price * lineItem.quantity - discountAmount

    /*
     * Used for backcompat with old tax system
     */
    if (order.tax_rate !== null) {
      const taxAmountIncludedInPrice = !includesTax
        ? 0
        : Math.round(
            calculatePriceTaxAmount({
              price: lineItem.unit_price,
              taxRate: order.tax_rate / 100,
              includesTax,
            })
          )

      lineSubtotal =
        (lineItem.unit_price - taxAmountIncludedInPrice) * lineItem.quantity -
        discountAmount

      const taxRate = order.tax_rate / 100
      return this.rounded(lineSubtotal * (1 + taxRate))
    }

    /*
     * New tax system uses the tax lines registerd on the line items
     */
    if (typeof lineItem.tax_lines === "undefined") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Tax calculation did not receive tax_lines"
      )
    }

    const taxRate = lineItem.tax_lines.reduce((acc, next) => {
      return acc + next.rate / 100
    }, 0)
    const taxAmountIncludedInPrice = !includesTax
      ? 0
      : Math.round(
          calculatePriceTaxAmount({
            price: lineItem.unit_price,
            taxRate,
            includesTax,
          })
        )

    lineSubtotal =
      (lineItem.unit_price - taxAmountIncludedInPrice) * lineItem.quantity -
      discountAmount

    const taxTotal = lineItem.tax_lines.reduce((acc, next) => {
      const taxRate = next.rate / 100
      return acc + this.rounded(lineSubtotal * taxRate)
    }, 0)

    return lineSubtotal + taxTotal
  }

  /**
   * Calculates refund total of line items.
   * If any of the items to return have been discounted, we need to
   * apply the discount again before refunding them.
   * @param order - cart or order to calculate subtotal for
   * @param lineItems - the line items to calculate refund total for
   * @return the calculated subtotal
   */
  async getRefundTotal(order: Order, lineItems: LineItem[]): Promise<number> {
    let itemIds = order.items.map((i) => i.id)

    // in case we swap a swap, we need to include swap items
    if (order.swaps && order.swaps.length) {
      for (const s of order.swaps) {
        const swapItemIds = s.additional_items.map((el) => el.id)
        itemIds = [...itemIds, ...swapItemIds]
      }
    }

    if (order.claims && order.claims.length) {
      for (const c of order.claims) {
        const claimItemIds = c.additional_items.map((el) => el.id)
        itemIds = [...itemIds, ...claimItemIds]
      }
    }

    const refunds: number[] = []
    for (const item of lineItems) {
      if (!itemIds.includes(item.id)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Line item does not exist on order"
        )
      }

      const refund = await this.getLineItemRefund(order, item)
      refunds.push(refund)
    }

    return this.rounded(refunds.reduce((acc, next) => acc + next, 0))
  }

  /**
   * Calculates either fixed or percentage discount of a variant
   * @param lineItem - id of line item
   * @param variant - id of variant in line item
   * @param variantPrice - price of the variant based on region
   * @param value - discount value
   * @param discountType - the type of discount (fixed or percentage)
   * @return triples of lineitem, variant and applied discount
   */
  calculateDiscount_(
    lineItem: LineItem,
    variant: string,
    variantPrice: number,
    value: number,
    discountType: DiscountRuleType
  ): LineDiscount {
    if (!lineItem.allow_discounts) {
      return {
        lineItem,
        variant,
        amount: 0,
      }
    }
    if (discountType === DiscountRuleType.PERCENTAGE) {
      return {
        lineItem,
        variant,
        amount: ((variantPrice * lineItem.quantity) / 100) * value,
      }
    } else {
      return {
        lineItem,
        variant,
        amount:
          value >= variantPrice * lineItem.quantity
            ? variantPrice * lineItem.quantity
            : value * lineItem.quantity,
      }
    }
  }

  /**
   * If the rule of a discount has allocation="item", then we need
   * to calculate discount on each item in the cart. Furthermore, we need to
   * make sure to only apply the discount on valid variants. And finally we
   * return ether an array of percentages discounts or fixed discounts
   * alongside the variant on which the discount was applied.
   * @param discount - the discount to which we do the calculation
   * @param cart - the cart to calculate discounts for
   * @return array of triples of lineitem, variant and applied discount
   */
  getAllocationItemDiscounts(
    discount: Discount,
    cart: Cart | Order
  ): LineDiscount[] {
    const discounts: LineDiscount[] = cart.items.map((item) => ({
      lineItem: item,
      variant: item.variant.id,
      amount: this.getLineItemDiscountAdjustment(item, discount),
    }))

    return discounts
  }

  getLineItemDiscountAdjustment(
    lineItem: LineItem,
    discount: Discount
  ): number {
    const matchingDiscount = lineItem.adjustments?.find(
      (adjustment) => adjustment.discount_id === discount.id
    )

    if (!matchingDiscount) {
      return 0
    }

    return matchingDiscount.amount
  }

  getLineItemAdjustmentsTotal(cartOrOrder: Cart | Order): number {
    if (!cartOrOrder?.items?.length) {
      return 0
    }

    return cartOrOrder.items.reduce(
      (total, item) =>
        total +
          item.adjustments?.reduce(
            (total, adjustment) => total + adjustment.amount,
            0
          ) || 0,
      0
    )
  }

  /**
   * Returns the discount amount allocated to the line items of an order.
   * @param cartOrOrder - the cart or order to get line discount allocations for
   * @param discount - the discount to use as context for the calculation
   * @return the allocations that the discount has on the items in the cart or
   *   order
   */
  getLineDiscounts(
    cartOrOrder: {
      items: LineItem[]
      swaps?: Swap[]
      claims?: ClaimOrder[]
    },
    discount?: Discount
  ): LineDiscountAmount[] {
    let merged: LineItem[] = [...(cartOrOrder.items ?? [])]

    // merge items from order with items from order swaps
    if ("swaps" in cartOrOrder && cartOrOrder.swaps?.length) {
      for (const s of cartOrOrder.swaps) {
        merged = [...merged, ...s.additional_items]
      }
    }

    if ("claims" in cartOrOrder && cartOrOrder.claims?.length) {
      for (const c of cartOrOrder.claims) {
        merged = [...merged, ...c.additional_items]
      }
    }

    return merged.map((item) => {
      const adjustments = item?.adjustments || []
      const discountAdjustments = discount
        ? adjustments.filter(
            (adjustment) => adjustment.discount_id === discount.id
          )
        : []

      const customAdjustments = adjustments.filter(
        (adjustment) => adjustment.discount_id === null
      )

      const sumAdjustments = (total, adjustment) => total + adjustment.amount

      return {
        item,
        amount: item.allow_discounts
          ? discountAdjustments.reduce(sumAdjustments, 0)
          : 0,
        customAdjustmentsAmount: customAdjustments.reduce(sumAdjustments, 0),
      }
    })
  }

  /**
   * Breaks down the totals related to a line item; these are the subtotal, the
   * amount of discount applied to the line item, the amount of a gift card
   * applied to a line item and the amount of tax applied to a line item.
   * @param lineItem - the line item to calculate totals for
   * @param cartOrOrder - the cart or order to use as context for the calculation
   * @param options - the options to evaluate the line item totals for
   * @returns the breakdown of the line item totals
   */
  async getLineItemTotals(
    lineItem: LineItem,
    cartOrOrder: Cart | Order,
    options: LineItemTotalsOptions = {}
  ): Promise<LineItemTotals> {
    const calculationContext =
      options.calculation_context ||
      (await this.getCalculationContext(cartOrOrder, {
        exclude_shipping: true,
        exclude_gift_cards: options.exclude_gift_cards,
      }))
    const lineItemAllocation =
      calculationContext.allocation_map[lineItem.id] || {}

    let subtotal = lineItem.unit_price * lineItem.quantity
    if (
      this.featureFlagRouter_.isFeatureEnabled(
        TaxInclusivePricingFeatureFlag.key
      ) &&
      lineItem.includes_tax &&
      options.include_tax
    ) {
      subtotal = 0 // in that case we need to know the tax rate to compute it later
    }

    const raw_discount_total = lineItemAllocation.discount?.amount ?? 0
    const discount_total = Math.round(raw_discount_total)

    const lineItemTotals: LineItemTotals = {
      unit_price: lineItem.unit_price,
      quantity: lineItem.quantity,
      subtotal,
      discount_total,
      total: subtotal - discount_total,
      original_total: subtotal,
      original_tax_total: 0,
      tax_total: 0,
      tax_lines: lineItem.tax_lines || [],

      raw_discount_total,
    }

    // Tax Information
    if (options.include_tax) {
      // When we have an order with a tax rate we know that it is an
      // order from the old tax system. The following is a backward compat
      // calculation.
      if (isOrder(cartOrOrder) && cartOrOrder.tax_rate != null) {
        const taxRate = cartOrOrder.tax_rate / 100

        const includesTax =
          this.featureFlagRouter_.isFeatureEnabled(
            TaxInclusivePricingFeatureFlag.key
          ) && lineItem.includes_tax
        const taxIncludedInPrice = !lineItem.includes_tax
          ? 0
          : Math.round(
              calculatePriceTaxAmount({
                price: lineItem.unit_price,
                taxRate: taxRate,
                includesTax,
              })
            )
        lineItemTotals.subtotal =
          (lineItem.unit_price - taxIncludedInPrice) * lineItem.quantity
        lineItemTotals.total = lineItemTotals.subtotal

        lineItemTotals.original_tax_total = lineItemTotals.subtotal * taxRate
        lineItemTotals.tax_total =
          (lineItemTotals.subtotal - discount_total) * taxRate

        lineItemTotals.total += lineItemTotals.tax_total
        lineItemTotals.original_total += lineItemTotals.original_tax_total
      } else {
        let taxLines: LineItemTaxLine[]

        /*
         * Line Items on orders will already have tax lines. But for cart line
         * items we have to get the line items from the tax provider.
         */
        if (options.use_tax_lines || isOrder(cartOrOrder)) {
          if (!isDefined(lineItem.tax_lines) && lineItem.variant_id) {
            throw new MedusaError(
              MedusaError.Types.UNEXPECTED_STATE,
              "Tax Lines must be joined on items to calculate taxes"
            )
          }

          taxLines = lineItem.tax_lines
        } else {
          if (lineItem.is_return) {
            if (!isDefined(lineItem.tax_lines) && lineItem.variant_id) {
              throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                "Return Line Items must join tax lines"
              )
            }
            taxLines = lineItem.tax_lines
          } else {
            taxLines = (await this.taxProviderService_
              .withTransaction(this.activeManager_)
              .getTaxLines([lineItem], calculationContext)) as LineItemTaxLine[]
          }
        }

        lineItemTotals.tax_lines = taxLines
      }
    }

    if (lineItemTotals.tax_lines.length > 0) {
      lineItemTotals.tax_total = await this.taxCalculationStrategy_.calculate(
        [lineItem],
        lineItemTotals.tax_lines,
        calculationContext
      )
      const noDiscountContext = {
        ...calculationContext,
        allocation_map: {}, // Don't account for discounts
      }

      lineItemTotals.original_tax_total =
        await this.taxCalculationStrategy_.calculate(
          [lineItem],
          lineItemTotals.tax_lines,
          noDiscountContext
        )

      if (
        this.featureFlagRouter_.isFeatureEnabled(
          TaxInclusivePricingFeatureFlag.key
        ) &&
        lineItem.includes_tax
      ) {
        lineItemTotals.subtotal +=
          lineItem.unit_price * lineItem.quantity -
          lineItemTotals.original_tax_total
        lineItemTotals.total += lineItemTotals.subtotal
        lineItemTotals.original_total += lineItemTotals.subtotal
      }

      lineItemTotals.total += lineItemTotals.tax_total
      lineItemTotals.original_total += lineItemTotals.original_tax_total
    }

    return lineItemTotals
  }

  /**
   * Gets a total for a line item. The total can take gift cards, discounts and
   * taxes into account. This can be controlled through the options.
   * @param lineItem - the line item to calculate a total for
   * @param cartOrOrder - the cart or order to use as context for the calculation
   * @param options - the options to use for the calculation
   * @returns the line item total
   */
  async getLineItemTotal(
    lineItem: LineItem,
    cartOrOrder: Cart | Order,
    options: GetLineItemTotalOptions = {}
  ): Promise<number> {
    const lineItemTotals = await this.getLineItemTotals(lineItem, cartOrOrder, {
      include_tax: options.include_tax,
    })

    let toReturn = lineItemTotals.subtotal
    if (!options.exclude_discounts) {
      toReturn += lineItemTotals.discount_total
    }

    if (options.include_tax) {
      toReturn += lineItemTotals.tax_total
    }

    return toReturn
  }

  /**
   * Gets the amount that can be gift carded on a cart. In regions where gift
   * cards are taxable this amount should exclude taxes.
   * @param cartOrOrder - the cart or order to get gift card amount for
   * @return the gift card amount applied to the cart or order
   */
  async getGiftCardableAmount(cartOrOrder: Cart | Order): Promise<number> {
    if (cartOrOrder.region?.gift_cards_taxable) {
      const subtotal = await this.getSubtotal(cartOrOrder)
      const discountTotal = await this.getDiscountTotal(cartOrOrder)
      return subtotal - discountTotal
    }

    return await this.getTotal(cartOrOrder, {
      exclude_gift_cards: true,
    })
  }

  /**
   * Gets the gift card amount on a cart or order.
   * @param cartOrOrder - the cart or order to get gift card amount for
   * @return the gift card amount applied to the cart or order
   */
  async getGiftCardTotal(
    cartOrOrder: Cart | Order,
    opts: { gift_cardable?: number } = {}
  ): Promise<{
    total: number
    tax_total: number
  }> {
    let giftCardable: number

    if (typeof opts.gift_cardable !== "undefined") {
      giftCardable = opts.gift_cardable
    } else {
      const subtotal = await this.getSubtotal(cartOrOrder)
      const discountTotal = await this.getDiscountTotal(cartOrOrder)

      giftCardable = subtotal - discountTotal
    }

    return await this.newTotalsService_.getGiftCardTotals(giftCardable, {
      region: cartOrOrder.region,
      giftCards: cartOrOrder.gift_cards || [],
      giftCardTransactions: cartOrOrder["gift_card_transactions"] || [],
    })
  }

  /**
   * Calculates the total discount amount for each of the different supported
   * discount types. If discounts aren't present or invalid returns 0.
   * @param cartOrOrder - the cart or order to calculate discounts for
   * @return the total discounts amount
   */
  async getDiscountTotal(cartOrOrder: Cart | Order): Promise<number> {
    const subtotal = await this.getSubtotal(cartOrOrder, {
      excludeNonDiscounts: true,
    })

    const discountTotal = Math.round(
      this.getLineItemAdjustmentsTotal(cartOrOrder)
    )

    if (subtotal < 0) {
      return this.rounded(Math.max(subtotal, discountTotal))
    }

    return this.rounded(Math.min(subtotal, discountTotal))
  }

  /**
   * Prepares the calculation context for a tax total calculation.
   * @param calculationContextData - the calculationContextData to get the calculation context for
   * @param options - options to gather context by
   * @return the tax calculation context
   */
  async getCalculationContext(
    calculationContextData: CalculationContextData,
    options: CalculationContextOptions = {}
  ): Promise<TaxCalculationContext> {
    const allocationMap = await this.getAllocationMap(calculationContextData, {
      exclude_gift_cards: options.exclude_gift_cards,
      exclude_discounts: options.exclude_discounts,
    })

    let shippingMethods: ShippingMethod[] = []
    // Default to include shipping methods
    if (!options.exclude_shipping) {
      shippingMethods = calculationContextData.shipping_methods || []
    }

    return {
      shipping_address: calculationContextData.shipping_address,
      shipping_methods: shippingMethods,
      customer: calculationContextData.customer,
      region: calculationContextData.region,
      is_return: options.is_return ?? false,
      allocation_map: allocationMap,
    }
  }

  /**
   * Rounds a number using Math.round.
   * @param value - the value to round
   * @return the rounded value
   */
  rounded(value: number): number {
    return Math.round(value)
  }
}

export default TotalsService
