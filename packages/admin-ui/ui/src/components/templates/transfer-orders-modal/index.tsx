import { Order } from "@medusajs/medusa"
import {
  useAdminCustomer,
  useAdminCustomers,
  useAdminUpdateOrder,
} from "medusa-react"
import moment from "moment"
import React from "react"
import { useTranslation } from "react-i18next"
import {
  DisplayTotalAmount,
  FulfillmentStatusComponent,
  PaymentStatusComponent,
} from "../../../domain/orders/details/templates"
import { useDebounce } from "../../../hooks/use-debounce"
import useNotification from "../../../hooks/use-notification"
import { Option } from "../../../types/shared"
import Badge from "../../fundamentals/badge"
import Button from "../../fundamentals/button"
import Modal from "../../molecules/modal"
import Select from "../../molecules/select/next-select/select"

type TransferOrdersModalProps = {
  order: Order
  onDismiss: () => void
}

const TransferOrdersModal: React.FC<TransferOrdersModalProps> = ({
  order,
  onDismiss,
}) => {
  const { t } = useTranslation()
  const [customersQuery, setCustomersQuery] = React.useState<string>("")
  const debouncedCustomersQuery = useDebounce(customersQuery, 400)
  const { customers } = useAdminCustomers({
    q: debouncedCustomersQuery,
    has_account: true,
    limit: 30,
    offset: 0,
  })

  const notification = useNotification()

  const [selectedCustomer, setSelectedCustomer] = React.useState<{
    label: string
    value: string
  } | null>(null)

  const { mutate: updateOrder, isLoading } = useAdminUpdateOrder(order.id)

  const { customer, isLoading: isLoadingCustomer } = useAdminCustomer(
    selectedCustomer?.value || ""
  )
  const onSubmit = async () => {
    if (isLoadingCustomer || !customer) {
      return
    }

    if (customer.id === order.customer_id) {
      notification(
        t("Info"),
        t("Customer is already the owner of the order"),
        "info"
      )
      onDismiss()
      return
    }

    updateOrder(
      { customer_id: customer?.id, email: customer.email },
      {
        onSuccess: () => {
          notification(
            t("Success"),
            t("Successfully transferred order to different customer"),
            "success"
          )
          onDismiss()
        },
        onError: () => {
          notification(
            t("Error"),
            t("Could not transfer order to different customer"),
            "error"
          )
        },
      }
    )
  }

  const getCustomerOption = (customer: {
    id: string
    email: string
    first_name?: string
    last_name?: string
  }) => {
    if (!customer) {
      return undefined
    }

    const customerLabel = (c: {
      email: string
      first_name?: string
      last_name?: string
    }) => {
      if (c.first_name && c.last_name) {
        return `${c.first_name} ${c.last_name} - ${c.email}`
      } else if (c.first_name) {
        return `${c.first_name} - ${c.email}`
      } else if (c.last_name) {
        return `${c.last_name} - ${c.email}`
      }
      return `${c.email}`
    }

    return {
      value: customer.id,
      label: customerLabel(customer),
    }
  }
  const customerOptions = React.useMemo(() => {
    const isOption = (c: Option | undefined): c is Option => {
      return !!c
    }

    return customers?.map((c) => getCustomerOption(c)).filter(isOption) || []
  }, [customers])

  return (
    <Modal handleClose={onDismiss}>
      <Modal.Body>
        <Modal.Header handleClose={onDismiss}>
          <h2 className="inter-xlarge-semibold">{t("Transfer order")}</h2>
        </Modal.Header>
        <Modal.Content>
          <div className="space-y-xlarge flex flex-col">
            <div className="space-y-xsmall">
              <h3 className="inter-base-semibold">{t("Order")}</h3>
              <div className="border-grey-20 rounded-rounded py-xsmall flex items-center justify-between border px-2.5">
                <Badge variant="default">
                  <span className="text-grey-60">{`#${order.display_id}`}</span>
                </Badge>
                <span className="text-grey-50">
                  {moment(new Date(order.created_at)).format("MMM D, H:mm A")}
                </span>
                <PaymentStatusComponent status={order.payment_status} />
                <FulfillmentStatusComponent status={order.fulfillment_status} />
                <DisplayTotalAmount
                  currency={order.currency_code}
                  totalAmount={order.total}
                />
              </div>
            </div>
            <div className="grid w-full grid-cols-2">
              <div className="flex flex-col">
                <span className="inter-base-semibold">
                  {t("Current Owner")}
                </span>
                <span className="inter-base-regular">
                  {t("The customer currently related to this order")}
                </span>
              </div>
              <div className="flex items-center">
                <Select
                  isDisabled={true}
                  value={getCustomerOption({
                    id: order.customer_id,
                    email: order.email,
                    first_name:
                      order.customer.first_name ||
                      order.billing_address?.first_name ||
                      order.shipping_address?.first_name ||
                      undefined,
                    last_name:
                      order.customer.last_name ||
                      order.billing_address?.last_name ||
                      order.shipping_address?.last_name ||
                      undefined,
                  })}
                />
              </div>
            </div>
            <div className="grid w-full grid-cols-2">
              <div className="flex flex-col">
                <span className="inter-base-semibold">{t("New Owner")}</span>
                <span className="inter-base-regular">
                  {t("The customer to transfer this order to")}
                </span>
              </div>
              <div className="flex items-center">
                <Select
                  value={selectedCustomer}
                  onChange={(value) => {
                    setSelectedCustomer(value)
                  }}
                  isMulti={false}
                  options={customerOptions}
                  isSearchable={true}
                  onInputChange={(value) => {
                    setCustomersQuery(value)
                  }}
                  truncateOption={true}
                />
              </div>
            </div>
          </div>
        </Modal.Content>
        <Modal.Footer>
          <div className="flex w-full justify-end">
            <div className="gap-x-xsmall flex">
              <Button
                onClick={onDismiss}
                size="small"
                className="border-grey-20 border"
                variant="ghost"
              >
                {t("Cancel")}
              </Button>
              <Button
                type="submit"
                size="small"
                variant="primary"
                loading={isLoading}
                disabled={
                  isLoading ||
                  !selectedCustomer ||
                  isLoadingCustomer ||
                  !customer
                }
                onClick={onSubmit}
              >
                {t("Confirm")}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal.Body>
    </Modal>
  )
}

export default TransferOrdersModal
