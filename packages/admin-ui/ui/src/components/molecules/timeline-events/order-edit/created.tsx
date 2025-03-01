import { LineItem, OrderEdit, OrderItemChange } from "@medusajs/medusa"
import {
  useAdminCancelOrderEdit,
  useAdminConfirmOrderEdit,
  useAdminDeleteOrderEdit,
  useAdminUser,
} from "medusa-react"
import React, { useContext } from "react"

import { OrderEditEvent } from "../../../../hooks/use-build-timeline"
import useImperativeDialog from "../../../../hooks/use-imperative-dialog"
import useNotification from "../../../../hooks/use-notification"
import { getErrorMessage } from "../../../../utils/error-messages"
import TwoStepDelete from "../../../atoms/two-step-delete"
import Button from "../../../fundamentals/button"
import EditIcon from "../../../fundamentals/icons/edit-icon"
import ImagePlaceholder from "../../../fundamentals/image-placeholder"
import EventContainer from "../event-container"
import { OrderEditContext } from "../../../../domain/orders/edit/context"
import CopyToClipboard from "../../../atoms/copy-to-clipboard"
import { ByLine } from "."
import { useTranslation } from "react-i18next"

type EditCreatedProps = {
  event: OrderEditEvent
}

enum OrderEditItemChangeType {
  ITEM_ADD = "item_add",
  ITEM_REMOVE = "item_remove",
  ITEM_UPDATE = "item_update",
}

const getInfo = (edit: OrderEdit): { type: string; user_id: string } => {
  if (edit.requested_at && edit.requested_by) {
    return {
      type: "requested",
      user_id: edit.requested_by,
    }
  }
  return {
    type: "created",
    user_id: edit.created_by,
  }
}

const EditCreated: React.FC<EditCreatedProps> = ({ event }) => {
  const { isModalVisible, showModal, setActiveOrderEdit } =
    useContext(OrderEditContext)

  const orderEdit = event.edit

  const { type, user_id } = getInfo(orderEdit)

  const notification = useNotification()

  const name = `Order Edit ${type}`

  const { user } = useAdminUser(user_id)

  const forceConfirmDialog = useImperativeDialog()

  const deleteOrderEdit = useAdminDeleteOrderEdit(orderEdit.id)
  const cancelOrderEdit = useAdminCancelOrderEdit(orderEdit.id)
  const confirmOrderEdit = useAdminConfirmOrderEdit(orderEdit.id)

  const onDeleteOrderEditClicked = () => {
    deleteOrderEdit.mutate(undefined, {
      onSuccess: () => {
        notification("Success", `Successfully deleted Order Edit`, "success")
      },
      onError: (err) => {
        notification("Error", getErrorMessage(err), "error")
      },
    })
  }

  const onCancelOrderEditClicked = () => {
    cancelOrderEdit.mutate(undefined, {
      onSuccess: () => {
        notification("Success", `Successfully canceled Order Edit`, "success")
      },
      onError: (err) => {
        notification("Error", getErrorMessage(err), "error")
      },
    })
  }

  const onConfirmEditClicked = async () => {
    const shouldDelete = await forceConfirmDialog({
      heading: "Delete Confirm",
      text: "By force confirming you allow the order edit to be fulfilled. You will still have to reconcile payments manually after confirming.",
      confirmText: "Yes, Force Confirm",
      cancelText: "No, Cancel",
    })

    if (shouldDelete) {
      confirmOrderEdit.mutate(undefined, {
        onSuccess: () => {
          notification(
            "Success",
            `Successfully confirmed Order Edit`,
            "success"
          )
        },
        onError: (err) => {
          notification("Error", getErrorMessage(err), "error")
        },
      })
    }
  }

  const onCopyConfirmationLinkClicked = () => {
    console.log("TODO")
  }

  const onContinueEdit = () => {
    setActiveOrderEdit(orderEdit.id)
    showModal()
  }

  // hide last created edit while editing and prevent content flashing while loading
  if (isModalVisible && orderEdit?.status === "created") {
    return null
  }
  const { t } = useTranslation()
  return (
    <>
      <EventContainer
        title={name}
        icon={<EditIcon size={20} />}
        time={event.time}
        isFirst={event.first}
        midNode={<ByLine user={user} />}
      >
        {orderEdit.internal_note && (
          <div className="px-base py-small mt-base mb-large rounded-large bg-grey-10 inter-base-regular text-grey-90">
            {orderEdit.internal_note}
          </div>
        )}
        <div>
          <OrderEditChanges orderEdit={orderEdit} />
        </div>
        {(orderEdit.status === "created" ||
          orderEdit.status === "requested") && (
          <div className="space-y-xsmall mt-large">
            {type === "created" ? (
              <>
                <Button
                  className="border-grey-20 w-full border"
                  size="small"
                  variant="ghost"
                  onClick={onContinueEdit}
                >
                  Continue order edit
                </Button>
                <TwoStepDelete
                  onDelete={onDeleteOrderEditClicked}
                  className="border-grey-20 w-full border"
                >
                  {t("Delete the order edit")}
                </TwoStepDelete>
              </>
            ) : (
              <>
                <Button
                  className="border-grey-20 w-full border"
                  size="small"
                  variant="ghost"
                  onClick={onCopyConfirmationLinkClicked}
                >
                  {t("Copy Confirmation-Request Link")}
                </Button>
                <Button
                  className="border-grey-20 w-full border"
                  size="small"
                  variant="ghost"
                  onClick={onConfirmEditClicked}
                >
                  {t("Force Confirm")}
                </Button>

                <TwoStepDelete
                  onDelete={onCancelOrderEditClicked}
                  className="border-grey-20 w-full border"
                >
                  {t("Cancel Order Edit")}
                </TwoStepDelete>
              </>
            )}
          </div>
        )}
      </EventContainer>
    </>
  )
}

const OrderEditChanges = ({ orderEdit }) => {
  if (!orderEdit) {
    return <></>
  }
  const added = orderEdit.changes.filter(
    (oec: OrderItemChange) =>
      oec.type === OrderEditItemChangeType.ITEM_ADD ||
      (oec.type === OrderEditItemChangeType.ITEM_UPDATE &&
        oec.line_item &&
        oec.original_line_item &&
        oec.original_line_item.quantity < oec.line_item.quantity)
  )

  const removed = orderEdit.changes.filter(
    (oec) =>
      oec.type === OrderEditItemChangeType.ITEM_REMOVE ||
      (oec.type === OrderEditItemChangeType.ITEM_UPDATE &&
        oec.line_item &&
        oec.original_line_item &&
        oec.original_line_item.quantity > oec.line_item.quantity)
  )
  const { t } = useTranslation()
  return (
    <div className="gap-y-base flex flex-col">
      {added.length > 0 && (
        <div>
          <span className="inter-small-regular text-grey-50">{t("Added")}</span>
          {added.map((change) => (
            <OrderEditChangeItem change={change} key={change.id} />
          ))}
        </div>
      )}
      {removed.length > 0 && (
        <div>
          <span className="inter-small-regular text-grey-50">
            {t("Removed")}
          </span>
          {removed.map((change) => (
            <OrderEditChangeItem change={change} key={change.id} />
          ))}
        </div>
      )}
    </div>
  )
}

type OrderEditChangeItemProps = {
  change: OrderItemChange
}

const OrderEditChangeItem: React.FC<OrderEditChangeItemProps> = ({
  change,
}) => {
  let quantity
  const isAdd = change.type === OrderEditItemChangeType.ITEM_ADD

  if (isAdd) {
    quantity = (change.line_item as LineItem).quantity
  } else {
    quantity =
      (change.original_line_item as LineItem)?.quantity -
      (change.line_item as LineItem)?.quantity
  }

  quantity = Math.abs(quantity)

  const lineItem = isAdd ? change.line_item : change.original_line_item

  return (
    <div className="gap-x-base mt-xsmall flex">
      <div>
        <div className="rounded-rounded flex h-[40px] w-[30px] overflow-hidden">
          {lineItem?.thumbnail ? (
            <img src={lineItem.thumbnail} className="object-cover" />
          ) : (
            <ImagePlaceholder />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="inter-small-semibold text-grey-90">
          {quantity > 1 && <>{quantity}x</>} {lineItem?.title} &nbsp;
          {lineItem?.variant?.sku && (
            <CopyToClipboard value={lineItem?.variant?.sku} iconSize={14} />
          )}
        </span>
        <span className="inter-small-regular text-grey-50 flex">
          {lineItem?.variant?.options?.map((option) => option.value)}
        </span>
      </div>
    </div>
  )
}

export default EditCreated
