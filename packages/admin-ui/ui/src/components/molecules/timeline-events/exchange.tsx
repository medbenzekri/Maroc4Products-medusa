import { ReturnItem } from "@medusajs/medusa"
import {
  useAdminCancelReturn,
  useAdminCancelSwap,
  useAdminOrder,
  useAdminStore,
} from "medusa-react"
import React, { useEffect, useState } from "react"

import CreateFulfillmentModal from "../../../domain/orders/details/create-fulfillment"
import { ReceiveReturnMenu } from "../../../domain/orders/details/receive-return"
import useOrdersExpandParam from "../../../domain/orders/details/utils/use-admin-expand-paramter"
import { ExchangeEvent } from "../../../hooks/use-build-timeline"
import useNotification from "../../../hooks/use-notification"
import Medusa from "../../../services/api"
import { getErrorMessage } from "../../../utils/error-messages"
import CopyToClipboard from "../../atoms/copy-to-clipboard"
import Button from "../../fundamentals/button"
import CancelIcon from "../../fundamentals/icons/cancel-icon"
import DollarSignIcon from "../../fundamentals/icons/dollar-sign-icon"
import RefreshIcon from "../../fundamentals/icons/refresh-icon"
import TruckIcon from "../../fundamentals/icons/truck-icon"
import DeletePrompt from "../../organisms/delete-prompt"
import { ActionType } from "../actionables"
import IconTooltip from "../icon-tooltip"
import { FulfillmentStatus, PaymentStatus, ReturnStatus } from "../order-status"
import EventActionables from "./event-actionables"
import EventContainer, { EventIconColor } from "./event-container"
import EventItemContainer from "./event-item-container"
import { useTranslation } from "react-i18next"
import { t } from "i18next"

type ExchangeProps = {
  event: ExchangeEvent
  refetch: () => void
}

type ExchangeStatusProps = {
  event: ExchangeEvent
}

const ExchangeStatus: React.FC<ExchangeStatusProps> = ({ event }) => {
  const divider = <div className="bg-grey-20 h-11 w-px" />
  const { t } = useTranslation()
  return (
    <div className="inter-small-regular gap-x-base flex items-center">
      <div className="gap-y-2xsmall flex flex-col">
        <span className="text-grey-50">{t("Payment")}:</span>
        <PaymentStatus paymentStatus={event.paymentStatus} />
      </div>
      {divider}
      <div className="gap-y-2xsmall flex flex-col">
        <span className="text-grey-50">{t("Return")}:</span>
        <ReturnStatus returnStatus={event.returnStatus} />
      </div>
      {divider}
      <div className="gap-y-2xsmall flex flex-col">
        <span className="text-grey-50">{t("Fulfillment")}:</span>
        <FulfillmentStatus fulfillmentStatus={event.fulfillmentStatus} />
      </div>
    </div>
  )
}

const Exchange: React.FC<ExchangeProps> = ({ event, refetch }) => {
  const [showCancel, setShowCancel] = useState(false)
  const [showCancelReturn, setShowCancelReturn] = useState(false)
  const [showReceiveReturn, setShowReceiveReturn] = useState(false)
  const [showCreateFulfillment, setShowCreateFulfillment] = useState(false)
  const cancelExchange = useAdminCancelSwap(event.orderId)
  const cancelReturn = useAdminCancelReturn(event.returnId)
  const [differenceCardId, setDifferenceCardId] = useState<string | undefined>(
    undefined
  )
  const [paymentFormatWarning, setPaymentFormatWarning] = useState<
    string | undefined
  >(undefined)
  const [payable, setPayable] = useState(true)
  const { store } = useAdminStore()
  const { orderRelations } = useOrdersExpandParam()
  const { order } = useAdminOrder(event.orderId, {
    expand: orderRelations,
  })

  const notification = useNotification()

  useEffect(() => {
    if (!store) {
      return
    }

    if (event.paymentStatus !== "not_paid") {
      setPayable(false)
      return
    }

    if (store.swap_link_template?.indexOf("{cart_id}") === -1) {
      setPaymentFormatWarning(
        "Store payment link does not have the default format, as it does not contain '{cart_id}'. Either update the payment link to include '{cart_id}' or update this method to reflect the format of your payment link."
      )
    }

    if (!store.swap_link_template) {
      setPaymentFormatWarning(
        "No payment link has been set for this store. Please update store settings."
      )
    }

    if (event.exchangeCartId) {
      setDifferenceCardId(
        store.swap_link_template?.replace(/\{cart_id\}/, event.exchangeCartId)
      )
    }
  }, [
    store?.swap_link_template,
    event.exchangeCartId,
    event.paymentStatus,
    store,
  ])

  const paymentLink = getPaymentLink(
    payable,
    differenceCardId,
    paymentFormatWarning,
    event.exchangeCartId
  )

  const handleCancelExchange = async () => {
    await cancelExchange.mutateAsync(event.id)
    refetch()
  }

  const handleCancelReturn = async () => {
    await cancelReturn.mutateAsync()
    refetch()
  }

  const handleProcessSwapPayment = () => {
    Medusa.orders
      .processSwapPayment(event.orderId, event.id)
      .then((_res) => {
        notification("Success", "Payment processed successfully", "success")
        refetch()
      })
      .catch((err) => {
        notification("Error", getErrorMessage(err), "error")
      })
  }

  const returnItems = getReturnItems(event)
  const newItems = getNewItems(event)

  const actions: ActionType[] = []

  if (event.paymentStatus === "awaiting") {
    actions.push({
      label: "Capture payment",
      icon: <DollarSignIcon size={20} />,
      onClick: handleProcessSwapPayment,
    })
  }

  if (event.returnStatus === "requested") {
    actions.push({
      label: "Cancel return",
      icon: <TruckIcon size={20} />,
      onClick: () => setShowCancelReturn(!showCancelReturn),
    })
  }

  if (
    !event.isCanceled &&
    !event.canceledAt &&
    event.fulfillmentStatus !== "fulfilled" &&
    event.fulfillmentStatus !== "shipped"
  ) {
    actions.push({
      label: "Cancel exchange",
      icon: <CancelIcon size={20} />,
      onClick: () => setShowCancel(!showCancel),
      variant: "danger",
    })
  }
  const { t } = useTranslation()
  const args = {
    title: event.canceledAt ? "Exchange Cancelled" : "Exchange Requested",
    icon: event.canceledAt ? (
      <CancelIcon size={20} />
    ) : (
      <RefreshIcon size={20} />
    ),
    expandable: !!event.canceledAt,
    iconColor: event.canceledAt
      ? EventIconColor.DEFAULT
      : EventIconColor.ORANGE,
    time: event.time,
    noNotification: event.noNotification,
    topNode: getActions(event, actions),
    children: [
      <div className="gap-y-base flex flex-col" key={event.id}>
        {event.canceledAt && (
          <div>
            <span className="inter-small-semibold mr-2">
              {t("Requested on")}:
            </span>
            <span className="text-grey-50">
              {new Date(event.time).toUTCString()}
            </span>
          </div>
        )}
        {!event.canceledAt && <ExchangeStatus event={event} />}
        {!event.canceledAt && paymentLink}
        {returnItems}
        {newItems}
        <div className="gap-x-xsmall flex items-center">
          {event.returnStatus === "requested" && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowReceiveReturn(true)}
            >
              {t("Receive Return")}
            </Button>
          )}
          {event.fulfillmentStatus === "not_fulfilled" && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowCreateFulfillment(true)}
            >
              {t("Fulfill Exchange")}
            </Button>
          )}
        </div>
      </div>,
    ],
  }
  return (
    <>
      <EventContainer {...args} />
      {showCancel && (
        <DeletePrompt
          handleClose={() => setShowCancel(!showCancel)}
          onDelete={handleCancelExchange}
          confirmText={t("Yes, cancel")}
          heading={t("Cancel exchange")}
          text={t("Are you sure you want to cancel this exchange?")}
          successText={t("Exchange cancelled")}
        />
      )}
      {showCancelReturn && (
        <DeletePrompt
          handleClose={() => setShowCancelReturn(!showCancelReturn)}
          onDelete={handleCancelReturn}
          confirmText={t("Yes, cancel")}
          heading={t("Cancel return")}
          text={t("Are you sure you want to cancel this return?")}
          successText={t("Return cancelled")}
        />
      )}
      {showReceiveReturn && order && (
        <ReceiveReturnMenu
          order={order}
          returnRequest={event.raw.return_order}
          onClose={() => setShowReceiveReturn(false)}
        />
      )}
      {showCreateFulfillment && (
        <CreateFulfillmentModal
          orderId={event.orderId}
          orderToFulfill={event.raw}
          handleCancel={() => setShowCreateFulfillment(false)}
        />
      )}
    </>
  )
}

function getNewItems(event: ExchangeEvent) {
  const { t } = useTranslation()
  return (
    <div className="gap-y-small flex flex-col">
      <span className="inter-small-regular text-grey-50">{t("New Items")}</span>
      <div>
        {event.newItems.map((i, index) => (
          <EventItemContainer key={index} item={i} />
        ))}
      </div>
    </div>
  )
}

function getPaymentLink(
  payable: boolean,
  differenceCardId: string | undefined,
  paymentFormatWarning: string | undefined,
  exchangeCartId: string | undefined
) {
  return payable ? (
    <div className="inter-small-regular gap-y-xsmall text-grey-50 flex flex-col">
      <div className="gap-x-xsmall flex items-center">
        {paymentFormatWarning && <IconTooltip content={paymentFormatWarning} />}
        <span>{t("Payment link")}:</span>
      </div>
      {differenceCardId && (
        <CopyToClipboard
          value={differenceCardId}
          displayValue={exchangeCartId}
        />
      )}
    </div>
  ) : null
}

function getReturnItems(event: ExchangeEvent) {
  return (
    <div className="gap-y-small flex flex-col">
      <span className="inter-small-regular text-grey-50">
        {t("Return Items")}
      </span>
      <div>
        {event.returnItems
          .filter((i) => !!i)
          .map((i: ReturnItem) => (
            <EventItemContainer
              key={i.id}
              item={{ ...i, quantity: i.requestedQuantity }}
            />
          ))}
      </div>
    </div>
  )
}

function getActions(event: ExchangeEvent, actions: ActionType[]) {
  if (actions.length === 0) {
    return null
  }

  return <EventActionables actions={actions} />
}

export default Exchange
