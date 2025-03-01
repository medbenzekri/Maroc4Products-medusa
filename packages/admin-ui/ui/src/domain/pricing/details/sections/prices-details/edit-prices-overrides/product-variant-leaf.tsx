import { MoneyAmount, ProductVariant } from "@medusajs/medusa"
import * as React from "react"
import { useTranslation } from "react-i18next"
import Button from "../../../../../../components/fundamentals/button"
import ChevronRightIcon from "../../../../../../components/fundamentals/icons/chevron-right-icon"

type ProductVariantLeafProps = {
  onClick: React.ButtonHTMLAttributes<HTMLButtonElement>["onClick"]
  variant: ProductVariant
  prices: MoneyAmount[]
}

const ProductVariantLeaf = ({
  variant,
  prices,
  onClick,
}: ProductVariantLeafProps) => {
  const { t } = useTranslation()
  const { title, sku } = variant
  const hasPrices = prices.length > 0
  return (
    <div className="flex flex-1 items-center">
      <div className="truncate">
        <span>{title}</span>
        {sku && <span className="text-grey-50 ml-xsmall">(SKU: {sku})</span>}
      </div>
      <div className="text-grey-50 flex flex-1 items-center justify-end">
        <div className="text-grey-50 mr-xsmall">
          {hasPrices ? (
            <span>{t("priceWithCount", { count: prices.length })}</span>
          ) : (
            <span className="inter-small-semibold text-orange-40">
              {t("Add prices")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="small"
          className="h-[32px] w-[32px]"
          onClick={onClick}
        >
          <ChevronRightIcon className="text-grey-40" />
        </Button>
      </div>
    </div>
  )
}

export default ProductVariantLeaf
