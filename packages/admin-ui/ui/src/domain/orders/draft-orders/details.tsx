import { Address } from "@medusajs/medusa"
import {
  useAdminDeleteDraftOrder,
  useAdminDraftOrder,
  useAdminDraftOrderRegisterPayment,
  useAdminStore,
  useAdminUpdateDraftOrder,
} from "medusa-react"
import moment from "moment"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import Avatar from "../../../components/atoms/avatar"
import BackButton from "../../../components/atoms/back-button"
import CopyToClipboard from "../../../components/atoms/copy-to-clipboard"
import Spinner from "../../../components/atoms/spinner"
import WidgetContainer from "../../../components/extensions/widget-container"
import Button from "../../../components/fundamentals/button"
import DetailsIcon from "../../../components/fundamentals/details-icon"
import DollarSignIcon from "../../../components/fundamentals/icons/dollar-sign-icon"
import TruckIcon from "../../../components/fundamentals/icons/truck-icon"
import StatusDot from "../../../components/fundamentals/status-indicator"
import JSONView from "../../../components/molecules/json-view"
import BodyCard from "../../../components/organisms/body-card"
import ConfirmationPrompt from "../../../components/organisms/confirmation-prompt"
import DeletePrompt from "../../../components/organisms/delete-prompt"
import { AddressType } from "../../../components/templates/address-form"
import useNotification from "../../../hooks/use-notification"
import { useWidgets } from "../../../providers/widget-provider"
import { isoAlpha2Countries } from "../../../utils/countries"
import { getErrorMessage } from "../../../utils/error-messages"
import extractCustomerName from "../../../utils/extract-customer-name"
import { formatAmountWithSymbol } from "../../../utils/prices"
import AddressModal from "../details/address-modal"
import DraftSummaryCard from "../details/detail-cards/draft-summary"
import { DisplayTotal, FormattedAddress } from "../details/templates"

type DeletePromptData = {
  resource: string
  onDelete: () => any
  show: boolean
}

const DraftOrderDetails = () => {
  const { id } = useParams()
  const { t } = useTranslation()

  const initDeleteState: DeletePromptData = {
    resource: "",
    onDelete: () => Promise.resolve(console.log("Delete resource")),
    show: false,
  }

  const [deletePromptData, setDeletePromptData] =
    useState<DeletePromptData>(initDeleteState)
  const [addressModal, setAddressModal] = useState<null | {
    address: Address
    type: AddressType
  }>(null)

  const [showMarkAsPaidConfirmation, setShowAsPaidConfirmation] =
    useState(false)

  const { draft_order, isLoading } = useAdminDraftOrder(id!)
  const { store, isLoading: isLoadingStore } = useAdminStore()

  const [paymentLink, setPaymentLink] = useState("")

  useEffect(() => {
    if (store && draft_order && store.payment_link_template) {
      setPaymentLink(
        store.payment_link_template.replace(/\{cart_id\}/, draft_order.cart_id)
      )
    }
  }, [isLoading, isLoadingStore])

  const markPaid = useAdminDraftOrderRegisterPayment(id!)
  const cancelOrder = useAdminDeleteDraftOrder(id!)
  const updateOrder = useAdminUpdateDraftOrder(id!)

  const navigate = useNavigate()
  const notification = useNotification()

  const OrderStatusComponent = () => {
    switch (draft_order?.status) {
      case "completed":
        return <StatusDot title={t("Completed")} variant="success" />
      case "open":
        return <StatusDot title={t("Open")} variant="default" />
      default:
        return null
    }
  }

  const PaymentActionables = () => {
    // Default label and action
    const label = t("Mark as paid")
    const action = () => setShowAsPaidConfirmation(true)

    return (
      <Button variant="secondary" size="small" onClick={action}>
        {label}
      </Button>
    )
  }

  const onMarkAsPaidConfirm = async () => {
    try {
      await markPaid.mutateAsync()
      notification(t("Success"), t("Successfully mark as paid"), "success")
    } catch (err) {
      notification(t("Error"), getErrorMessage(err), "error")
    } finally {
      setShowAsPaidConfirmation(false)
    }
  }

  const handleDeleteOrder = async () => {
    return cancelOrder.mutate(void {}, {
      onSuccess: () =>
        notification(t("Success"), t("Successfully canceled order"), "success"),
      onError: (err) => notification(t("Error"), getErrorMessage(err), "error"),
    })
  }

  const { getWidgets } = useWidgets()

  const afterWidgets = getWidgets("draft_order.details.after")
  const beforeWidgets = getWidgets("draft_order.details.before")

  const { cart } = draft_order || {}
  const { region } = cart || {}

  return (
    <div>
      <BackButton
        path="/a/draft-orders"
        label={t("Back to Draft Orders")}
        className="mb-xsmall"
      />
      {isLoading || !draft_order ? (
        <BodyCard className="pt-2xlarge flex w-full items-center justify-center">
          <Spinner size={"large"} variant={"secondary"} />
        </BodyCard>
      ) : (
        <div className="flex space-x-4">
          <div className="flex h-full w-full flex-col">
            {beforeWidgets?.length > 0 && (
              <div className="mb-4 flex w-full flex-col gap-y-4">
                {beforeWidgets.map((w, i) => {
                  return (
                    <WidgetContainer
                      key={i}
                      widget={w}
                      injectionZone="draft_order.details.before"
                      entity={draft_order}
                    />
                  )
                })}
              </div>
            )}

            <BodyCard
              className={"mb-4 min-h-[200px] w-full"}
              title={t("Order #{display_id}", {
                display_id: draft_order.display_id,
              })}
              subtitle={moment(draft_order.created_at).format(
                "D MMMM YYYY hh:mm a"
              )}
              status={<OrderStatusComponent />}
              customActionable={
                draft_order?.status === "completed" && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      navigate(`/a/orders/${draft_order.order_id}`)
                    }
                  >
                    {t("Go to Order")}
                  </Button>
                )
              }
              forceDropdown={draft_order?.status === "completed" ? false : true}
              actionables={
                draft_order?.status === "completed"
                  ? [
                      {
                        label: t("Go to Order"),
                        icon: null,
                        onClick: () => console.log("Should not be here"),
                      },
                    ]
                  : [
                      {
                        label: t("Cancel Draft Order"),
                        icon: null,
                        // icon: <CancelIcon size={"20"} />,
                        variant: "danger",
                        onClick: () =>
                          setDeletePromptData({
                            resource: t("Draft Order"),
                            onDelete: () => handleDeleteOrder(),
                            show: true,
                          }),
                      },
                    ]
              }
            >
              <div className="mt-6 flex space-x-6 divide-x">
                <div className="flex flex-col">
                  <div className="inter-smaller-regular text-grey-50 mb-1">
                    {t("Email")}
                  </div>
                  <div>{cart?.email}</div>
                </div>
                <div className="flex flex-col pl-6">
                  <div className="inter-smaller-regular text-grey-50 mb-1">
                    {t("Phone")}
                  </div>
                  <div>{cart?.shipping_address?.phone || "N/A"}</div>
                </div>
                <div className="flex flex-col pl-6">
                  <div className="inter-smaller-regular text-grey-50 mb-1">
                    {t("Amount {currency_code}", {
                      currency_code: region?.currency_code.toUpperCase(),
                    })}
                  </div>
                  <div>
                    {cart?.total && region?.currency_code
                      ? formatAmountWithSymbol({
                          amount: cart?.total,
                          currency: region?.currency_code,
                        })
                      : "N/A"}
                  </div>
                </div>
              </div>
            </BodyCard>
            <DraftSummaryCard order={draft_order} />
            <BodyCard
              className={"mb-4 h-auto min-h-0 w-full"}
              title={t("Payment")}
              customActionable={
                draft_order?.status !== "completed" && <PaymentActionables />
              }
            >
              <div className="mt-6">
                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.subtotal}
                  totalTitle={t("Subtotal")}
                />
                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.shipping_total}
                  totalTitle={t("Shipping")}
                />
                <DisplayTotal
                  currency={region?.currency_code}
                  totalAmount={cart?.tax_total}
                  totalTitle={t("Tax")}
                />
                <DisplayTotal
                  variant="bold"
                  currency={region?.currency_code}
                  totalAmount={cart?.total}
                  totalTitle={t("Total to pay")}
                />
                {draft_order?.status !== "completed" && (
                  <div className="text-grey-50 inter-small-regular mt-5 flex w-full items-center">
                    <span className="mr-2.5">{t("Payment link:")}</span>
                    {store?.payment_link_template ? (
                      <CopyToClipboard
                        value={paymentLink}
                        displayValue={draft_order.cart_id}
                        successDuration={1000}
                      />
                    ) : (
                      t("Configure payment link in store settings")
                    )}
                  </div>
                )}
              </div>
            </BodyCard>
            <BodyCard
              className={"mb-4 h-auto min-h-0 w-full"}
              title={t("Shipping")}
            >
              <div className="mt-6">
                {cart?.shipping_methods.map((method) => (
                  <div className="flex flex-col" key={method.id}>
                    <span className="inter-small-regular text-grey-50">
                      {t("Shipping Method")}
                    </span>
                    <span className="inter-small-regular text-grey-90 mt-2">
                      {method?.shipping_option.name || ""}
                    </span>
                    <div className="bg-grey-5 mt-8 flex h-full min-h-[100px] flex-col px-3 py-2">
                      <span className="inter-base-semibold">
                        {t("Data")}{" "}
                        <span className="text-grey-50 inter-base-regular">
                          {t("(1 item)")}
                        </span>
                      </span>
                      <div className="mt-4 flex flex-grow items-center">
                        <JSONView data={method?.data} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BodyCard>
            <BodyCard
              className={"mb-4 h-auto min-h-0 w-full"}
              title={t("Customer")}
              actionables={[
                {
                  label: t("Edit Shipping Address"),
                  icon: <TruckIcon size={"20"} />,
                  onClick: () =>
                    setAddressModal({
                      address: cart?.shipping_address,
                      type: AddressType.SHIPPING,
                    }),
                },
                {
                  label: t("Edit Billing Address"),
                  icon: <DollarSignIcon size={"20"} />,
                  onClick: () => {
                    if (cart?.billing_address) {
                      setAddressModal({
                        address: cart?.billing_address,
                        type: AddressType.BILLING,
                      })
                    }
                  },
                },
                {
                  label: t("Go to Customer"),
                  icon: <DetailsIcon size={"20"} />, // TODO: Change to Contact icon
                  onClick: () => navigate(`/a/customers/${cart?.customer.id}`),
                },
              ]}
            >
              <div className="mt-6">
                <div className="flex w-full items-center space-x-4">
                  <div className="flex h-[40px] w-[40px] ">
                    <Avatar
                      user={cart?.customer}
                      font="inter-large-semibold"
                      color="bg-grey-80"
                    />
                  </div>
                  <div>
                    <h1 className="inter-large-semibold text-grey-90">
                      {extractCustomerName(cart)}
                    </h1>
                    {cart?.shipping_address && (
                      <span className="inter-small-regular text-grey-50">
                        {cart.shipping_address.city},{" "}
                        {
                          isoAlpha2Countries[
                            cart.shipping_address.country_code?.toUpperCase()
                          ]
                        }
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex space-x-6 divide-x">
                  <div className="flex flex-col">
                    <div className="inter-small-regular text-grey-50 mb-1">
                      {t("Contact")}
                    </div>
                    <div className="inter-small-regular flex flex-col">
                      <span>{cart?.email}</span>
                      <span>{cart?.shipping_address?.phone || ""}</span>
                    </div>
                  </div>
                  <FormattedAddress
                    title={t("Shipping")}
                    addr={cart?.shipping_address || undefined}
                  />
                  <FormattedAddress
                    title={t("Billing")}
                    addr={cart?.billing_address || undefined}
                  />
                </div>
              </div>
            </BodyCard>
            {afterWidgets?.length > 0 && (
              <div className="mb-4 flex w-full flex-col gap-y-4">
                {afterWidgets.map((w, i) => {
                  return (
                    <WidgetContainer
                      key={i}
                      widget={w}
                      injectionZone="draft_order.details.after"
                      entity={draft_order}
                    />
                  )
                })}
              </div>
            )}
            <BodyCard
              className={"mb-4 h-auto min-h-0 w-full pt-[15px]"}
              title={t("Raw Draft Order")}
            >
              <JSONView data={draft_order!} />
            </BodyCard>
          </div>
        </div>
      )}
      {addressModal && (
        <AddressModal
          onClose={() => setAddressModal(null)}
          onSave={updateOrder.mutate}
          address={addressModal.address}
          type={addressModal.type}
          allowedCountries={region?.countries}
        />
      )}
      {/* An attempt to make a reusable delete prompt, so we don't have to hold +10
      state variables for showing different prompts */}
      {deletePromptData.show && (
        <DeletePrompt
          text={t("Are you sure?")}
          heading={t("Remove {resource}", {
            resource: deletePromptData?.resource,
          })}
          successText={t("{resource} has been removed", {
            resource: deletePromptData?.resource || "Resource",
          })}
          onDelete={() => deletePromptData.onDelete()}
          handleClose={() => setDeletePromptData(initDeleteState)}
        />
      )}

      {showMarkAsPaidConfirmation && (
        <ConfirmationPrompt
          heading={t("Mark as paid")}
          text={t(
            "This will create an order. Mark this as paid if you received the payment."
          )}
          confirmText={t("Mark paid")}
          cancelText={t("Cancel")}
          handleClose={() => setShowAsPaidConfirmation(false)}
          onConfirm={onMarkAsPaidConfirm}
        />
      )}
    </div>
  )
}

export default DraftOrderDetails
