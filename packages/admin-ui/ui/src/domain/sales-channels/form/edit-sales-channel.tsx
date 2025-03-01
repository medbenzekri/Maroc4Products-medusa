import { useAdminUpdateSalesChannel } from "medusa-react"
import { useState } from "react"

import { SalesChannel } from "@medusajs/medusa"
import { useTranslation } from "react-i18next"

import Button from "../../../components/fundamentals/button"
import InputField from "../../../components/molecules/input"
import Modal from "../../../components/molecules/modal"
import useNotification from "../../../hooks/use-notification"

type EditSalesChannelProps = {
  salesChannel: SalesChannel
  handleClose: () => void
}

/**
 * Modal with sales channels edit form.
 */
function EditSalesChannel(props: EditSalesChannelProps) {
  const { handleClose, salesChannel } = props

  const notification = useNotification()
  const { t } = useTranslation()

  const { mutate: updateSalesChannel, isLoading } = useAdminUpdateSalesChannel(
    salesChannel.id
  )

  const [name, setName] = useState(salesChannel.name)
  const [description, setDescription] = useState(salesChannel.description)

  const handleSubmit = () => {
    updateSalesChannel(
      { name, description },
      {
        onSuccess: () => {
          notification(
            t("Success"),
            t("The sales channel is successfully updated"),
            "success"
          )
          handleClose()
        },
        onError: () =>
          notification(
            t("Error"),
            t("Failed to update the sales channel"),
            "error"
          ),
      }
    )
  }

  return (
    <Modal handleClose={handleClose}>
      <Modal.Body>
        <Modal.Header handleClose={handleClose}>
          <span className="inter-xlarge-semibold">
            {t("Sales channel details")}
          </span>
        </Modal.Header>
        <Modal.Content>
          <div className="inter-base-semibold text-grey-90 mb-4">
            {t("General info")}
          </div>

          <div className="flex w-full flex-col gap-3">
            <InputField
              label={t("Name")}
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <InputField
              label={t("Description")}
              name="description"
              value={description!}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Modal.Content>
        <Modal.Footer>
          <div className="flex w-full justify-end">
            <Button
              variant="ghost"
              size="small"
              onClick={handleClose}
              className="mr-2"
            >
              {t("Close")}
            </Button>
            <Button
              disabled={!name.length || isLoading}
              variant="primary"
              className="min-w-[100px]"
              size="small"
              onClick={handleSubmit}
              loading={isLoading}
            >
              {t("Save")}
            </Button>
          </div>
        </Modal.Footer>
      </Modal.Body>
    </Modal>
  )
}

export default EditSalesChannel
