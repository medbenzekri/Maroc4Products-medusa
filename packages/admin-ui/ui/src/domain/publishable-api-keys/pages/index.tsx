import { useEffect, useState } from "react"

import { PublishableApiKey, SalesChannel } from "@medusajs/medusa"
import {
  useAdminAddPublishableKeySalesChannelsBatch,
  useAdminCreatePublishableApiKey,
} from "medusa-react"
import { useTranslation } from "react-i18next"

import BackButton from "../../../components/atoms/back-button"
import Fade from "../../../components/atoms/fade-wrapper"
import Spacer from "../../../components/atoms/spacer"
import Button from "../../../components/fundamentals/button"
import ChannelsIcon from "../../../components/fundamentals/icons/channels-icon"
import CrossIcon from "../../../components/fundamentals/icons/cross-icon"
import InputField from "../../../components/molecules/input"
import FocusModal from "../../../components/molecules/modal/focus-modal"
import SalesChannelsSummary from "../../../components/molecules/sales-channels-summary"
import BodyCard from "../../../components/organisms/body-card"
import useNotification from "../../../hooks/use-notification"
import useToggleState from "../../../hooks/use-toggle-state"
import AddSalesChannelsSideModal from "../modals/add-sales-channels"
import DetailsModal from "../modals/details"
import ManageSalesChannelsSideModal from "../modals/manage-sales-channels"
import PublishableApiKeysTable from "../tables/publishable-api-keys-table"

type AddSalesChannelsSectionProps = {
  setSelectedChannels: (arg: any) => void
  selectedChannels: Record<string, SalesChannel>
}

/**
 * Container for adding sales channels to PK scope.
 */
function AddSalesChannelsSection(props: AddSalesChannelsSectionProps) {
  const { setSelectedChannels, selectedChannels } = props

  const { t } = useTranslation()
  const [isModalVisible, showModal, hideModal] = useToggleState(false)

  const hasSelectedChannels = !!Object.keys(selectedChannels).length

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h5 className="inter-base-semibold text-grey-90 pb-1">
            {t("Sales channels")}
          </h5>
          <p className="text-grey-50">
            {t("Connect as many sales channels to your API key as you need.")}
          </p>
        </div>
        {!hasSelectedChannels && (
          <Button
            size="small"
            variant="secondary"
            className="h-[40px]"
            onClick={showModal}
          >
            {t("Add sales channels")}
          </Button>
        )}
      </div>
      {hasSelectedChannels && (
        <div className="mt-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded border p-1">
              <div className="rounded bg-gray-100 p-2">
                <ChannelsIcon />
              </div>
            </div>
            <SalesChannelsSummary
              channels={Object.values(selectedChannels)}
              showCount={2}
            />
          </div>
          <Button
            size="small"
            variant="secondary"
            className="h-[40px]"
            onClick={showModal}
          >
            {t("Edit sales channels")}
          </Button>
        </div>
      )}

      <AddSalesChannelsSideModal
        close={hideModal}
        isVisible={isModalVisible}
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
      />
    </div>
  )
}

type CreatePublishableKeyProps = {
  closeModal: () => void
}

/**
 * Focus modal container for creating Publishable Keys.
 */
function CreatePublishableKey(props: CreatePublishableKeyProps) {
  const { closeModal } = props
  const notification = useNotification()
  const { t } = useTranslation()

  const [name, setName] = useState("")
  const [keyId, setKeyId] = useState("")
  const [selectedChannels, setSelectedChannels] = useState({})

  const { mutateAsync: createPublishableApiKey } =
    useAdminCreatePublishableApiKey()

  const { mutateAsync: addSalesChannelsToKeyScope } =
    useAdminAddPublishableKeySalesChannelsBatch(keyId)

  const onSubmit = async () => {
    try {
      const res = await createPublishableApiKey({ title: name })
      setKeyId(res.publishable_api_key.id)
      notification(t("Success"), t("Created a new API key"), "success")
    } catch (e) {
      notification(t("Error"), t("Failed to create a new API key"), "error")
    }
  }

  useEffect(() => {
    if (keyId) {
      addSalesChannelsToKeyScope({
        sales_channel_ids: Object.keys(selectedChannels).map((id) => ({ id })),
      })
        .then(() => {
          notification(
            t("Success"),
            t("Sales channels added to the scope"),
            "success"
          )
        })
        .catch(() => {
          notification(
            t("Error"),
            t(
              "Error occurred while adding sales channels to the scope of the key"
            ),
            "success"
          )
        })
        .finally(closeModal)
    }
  }, [keyId, selectedChannels])

  return (
    <FocusModal>
      <FocusModal.Header>
        <div className="medium:w-8/12 flex w-full justify-between px-8">
          <Button size="small" variant="ghost" onClick={closeModal}>
            <CrossIcon size={20} />
          </Button>
          <div className="gap-x-small flex">
            <Button
              size="small"
              variant="primary"
              onClick={onSubmit}
              disabled={!name}
              className="rounded-rounded"
            >
              {t("Publish API key")}
            </Button>
          </div>
        </div>
      </FocusModal.Header>

      <FocusModal.Main className="no-scrollbar flex w-full justify-center">
        <div className="medium:w-7/12 large:w-6/12 small:w-4/5 my-16 max-w-[700px]">
          <h1 className="inter-xlarge-semibold text-grey-90 pb-8">
            {t("Create API Key")}
          </h1>
          <h5 className="inter-base-semibold text-grey-90 pb-1">
            {t("General Information")}
          </h5>
          <p className="text-grey-50 pb-8">
            {t(
              "Create and manage API keys. Right now this is only related to sales channels."
            )}
          </p>
          <InputField
            label={t("Title")}
            type="string"
            name="name"
            value={name}
            className="w-[338px]"
            placeholder="Name your key"
            onChange={(ev) => setName(ev.target.value)}
          />

          <div className="mt-16 mb-8 h-[1px] w-[100%] bg-gray-200" />

          <AddSalesChannelsSection
            selectedChannels={selectedChannels}
            setSelectedChannels={setSelectedChannels}
          />
        </div>
      </FocusModal.Main>
    </FocusModal>
  )
}

/**
 * Index page container for the "Publishable API keys" page
 */
function Index() {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<PublishableApiKey>()
  const [editKey, setEditKey] = useState<PublishableApiKey>()

  const [isCreateModalVisible, openCreateModal, closeCreateModal] =
    useToggleState(false)

  const actions = [
    {
      label: t("Create API key"),
      onClick: openCreateModal,
    },
  ]

  const _openChannelsModal = (pubKey: PublishableApiKey) => {
    setEditKey(pubKey)
  }

  const _closeChannelsModal = () => {
    setEditKey(null)
  }

  return (
    <div>
      <BackButton
        label={t("Back to settings")}
        path="/a/settings"
        className="mb-xsmall"
      />
      <BodyCard
        title={t("Publishable API keys")}
        subtitle={t(
          "These publishable keys will allow you to authenticate API requests."
        )}
        actionables={actions}
      >
        <PublishableApiKeysTable
          showDetailsModal={setSelectedKey}
          showChannelsModal={_openChannelsModal}
        />
        <DetailsModal
          selectedKey={selectedKey}
          close={() => setSelectedKey(undefined)}
        />
        <Fade isVisible={isCreateModalVisible} isFullScreen>
          <CreatePublishableKey closeModal={closeCreateModal} />
        </Fade>

        <ManageSalesChannelsSideModal
          keyId={editKey?.id}
          close={_closeChannelsModal}
        />
      </BodyCard>
      <Spacer />
    </div>
  )
}

export default Index
