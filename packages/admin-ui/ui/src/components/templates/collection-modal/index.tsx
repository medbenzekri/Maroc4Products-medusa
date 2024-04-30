import { ProductCollection } from "@medusajs/medusa"
import {
  useAdminCreateCollection,
  useAdminUpdateCollection,
} from "medusa-react"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import useNotification from "../../../hooks/use-notification"
import { getErrorMessage } from "../../../utils/error-messages"
import { nestedForm } from "../../../utils/nested-form"
import MetadataForm, {
  getSubmittableMetadata,
  MetadataFormType,
} from "../../forms/general/metadata-form"
import Button from "../../fundamentals/button"
import IconTooltip from "../../molecules/icon-tooltip"
import InputField from "../../molecules/input"
import Modal from "../../molecules/modal"
import { MetadataField } from "../../organisms/metadata"

type CollectionModalProps = {
  onClose: () => void
  onSubmit: (values: any, metadata: MetadataField[]) => void
  isEdit?: boolean
  collection?: ProductCollection
}

type CollectionModalFormData = {
  title: string
  title_ar: string 
  handle: string | undefined
  handle_ar: string | undefined
  metadata: MetadataFormType
}

const CollectionModal: React.FC<CollectionModalProps> = ({
  onClose,
  isEdit = false,
  collection,
}) => {
  const { t } = useTranslation()
  const { mutate: update, isLoading: updating } = useAdminUpdateCollection(
    collection?.id!
  )
  const { mutate: create, isLoading: creating } = useAdminCreateCollection()

  const form = useForm<CollectionModalFormData>({
    defaultValues: {
      title: collection?.title,
      handle: collection?.handle,
      // @ts-ignore
      title_ar: collection?.title_ar,
      // @ts-ignore
      handle_ar: collection?.handle_ar,
      metadata: {
        entries: Object.entries(collection?.metadata || {}).map(
          ([key, value]) => ({
            key,
            value: value as string,
            state: "existing",
          })
        ),
      },
    },
  })
  const { register, handleSubmit, reset } = form

  useEffect(() => {
    if (collection) {
      reset({
        title: collection.title,
        // @ts-ignore
        title_ar: collection.title_ar,
        // @ts-ignore
        handle_ar: collection.handle_ar,
        handle: collection.handle,
        metadata: {
          entries: Object.entries(collection.metadata || {}).map(
            ([key, value]) => ({
              key,
              value: value as string,
              state: "existing",
            })
          ),
        },
      })
    }
  }, [collection, reset])

  const notification = useNotification()

  if (isEdit && !collection) {
    throw new Error("Collection is required for edit")
  }

  const submit = (data: CollectionModalFormData) => {
    if (isEdit) {
      update(
        {
          title: data.title,
          title_ar: data.title_ar,
          handle_ar: data.handle_ar,
          handle: data.handle,
          metadata: getSubmittableMetadata(data.metadata),
        },
        {
          onSuccess: () => {
            notification(
              t("Success"),
              t("Successfully updated collection"),
              "success"
            )
            onClose()
          },
          onError: (error) => {
            notification(t("Error"), getErrorMessage(error), "error")
          },
        }
      )
    } else {
      create(
        {
          title: data.title,
          title_ar: data.title_ar,
          handle: data.handle,
          handle_ar: data.handle_ar,
          metadata: getSubmittableMetadata(data.metadata),
        },
        {
          onSuccess: () => {
            notification(
              t("Success"),
              t("Successfully created collection"),
              "success"
            )
            onClose()
          },
          onError: (error) => {
            notification(t("Error"), getErrorMessage(error), "error")
          },
        }
      )
    }
  }

  return (
    <Modal handleClose={onClose} isLargeModal>
      <Modal.Body>
        <Modal.Header handleClose={onClose}>
          <div>
            <h1 className="inter-xlarge-semibold mb-2xsmall">
              {isEdit ? t("Edit Collection") : t("Add Collection")}
            </h1>
            <p className="inter-small-regular text-grey-50">
              {t(
                "To create a collection, all you need is a title and a handle."
              )}
            </p>
          </div>
        </Modal.Header>
        <form onSubmit={handleSubmit(submit)}>
          <Modal.Content>
            <div>
              <h2 className="inter-base-semibold mb-base">{t("Details")}</h2>
              <div className="gap-x-base flex items-center">
                <InputField
                  label={t("Title")}
                  required
                  placeholder={t("Sunglasses")}
                  {...register("title", { required: true })}
                />
                <InputField
                  label={t("Handle")}
                  placeholder={t("sunglasses")}
                  {...register("handle")}
                  prefix="/"
                  tooltip={
                    <IconTooltip
                      content={t(
                        "URL Slug for the collection. Will be auto generated if left blank."
                      )}
                    />
                  }
                />
                <InputField
                  label={t("Title arabic")}
                  required
                  placeholder={t("نظارات شمسية")}
                  {...register("title_ar", { required: true })}
                />
                <InputField
                  label={t("Handle arabic")}
                  placeholder={t("sunglasses")}
                  {...register("handle_ar")}
                  prefix="/"
                  tooltip={
                    <IconTooltip
                      content={t(
                        "URL Slug for the collection. Will be auto generated if left blank."
                      )}
                    />
                  }
                />
              </div>
            </div>
            <div className="mt-xlarge">
              <h2 className="inter-base-semibold mb-base">{t("Metadata")}</h2>
              <MetadataForm form={nestedForm(form, "metadata")} />
            </div>
          </Modal.Content>
          <Modal.Footer>
            <div className="gap-x-xsmall flex w-full items-center justify-end">
              <Button
                variant="secondary"
                size="small"
                type="button"
                onClick={onClose}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="primary"
                size="small"
                loading={isEdit ? updating : creating}
              >
                {isEdit ? t("Save collection") : t("Publish collection")}
              </Button>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Body>
    </Modal>
  )
}

export default CollectionModal
