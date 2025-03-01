import { useAdminDeleteCollection } from "medusa-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import useImperativeDialog from "../../../hooks/use-imperative-dialog"
import EditIcon from "../../fundamentals/icons/edit-icon"
import TrashIcon from "../../fundamentals/icons/trash-icon"
import { ActionType } from "../../molecules/actionables"

const useCollectionActions = (collection) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dialog = useImperativeDialog()
  const deleteCollection = useAdminDeleteCollection(collection?.id)

  const handleDelete = async () => {
    const shouldDelete = await dialog({
      heading: t("Delete Collection"),
      text: t("Are you sure you want to delete this collection?"),
    })

    if (shouldDelete) {
      deleteCollection.mutate()
    }
  }

  const getActions = (coll): ActionType[] => [
    {
      label: t("Edit"),
      onClick: () => navigate(`/a/collections/${coll.id}`),
      icon: <EditIcon size={20} />,
    },
    {
      label: t("Delete"),
      variant: "danger",
      onClick: handleDelete,
      icon: <TrashIcon size={20} />,
    },
  ]

  return {
    getActions,
  }
}

export default useCollectionActions
