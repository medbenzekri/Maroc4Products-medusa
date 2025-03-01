import { MoneyAmount, Product } from "@medusajs/medusa"
import { useAdminStore, useAdminUpdatePriceList } from "medusa-react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import Button from "../../../../../../components/fundamentals/button"
import { CollapsibleTree } from "../../../../../../components/molecules/collapsible-tree"
import Modal from "../../../../../../components/molecules/modal"
import LayeredModal, {
  useLayeredModal,
} from "../../../../../../components/molecules/modal/layered-modal"
import PriceOverrides from "../../../../../../components/templates/price-overrides"
import useNotification from "../../../../../../hooks/use-notification"
import { mergeExistingWithDefault } from "../../../utils"
import { mapToPriceList } from "./mappers"
import ProductVariantLeaf from "./product-variant-leaf"

type EditPricesOverridesModalProps = {
  product: Product
  close: () => void
}

const EditPricesOverridesModal = ({
  close,
  product,
}: EditPricesOverridesModalProps) => {
  const { t } = useTranslation()
  const context = useLayeredModal()
  const { id: priceListId } = useParams()
  const updatePriceList = useAdminUpdatePriceList(priceListId || "")
  const { store } = useAdminStore()

  const defaultPrices = store?.currencies.map((curr) => ({
    currency_code: curr.code,
    amount: 0,
  })) as MoneyAmount[]

  const notification = useNotification()

  const getOnClick = (variant) => () =>
    context.push({
      title: t(`Edit price overrides`),
      onBack: () => context.pop(),
      view: (
        <PriceOverrides
          prices={mergeExistingWithDefault(
            variant.prices.filter((pr) => pr.price_list_id),
            defaultPrices
          )}
          isEdit
          defaultVariant={variant}
          variants={product.variants}
          onClose={close}
          onSubmit={(values) => {
            const updatedPrices = mapToPriceList(values, variant.id)

            updatePriceList.mutate(
              {
                prices: updatedPrices,
              },
              {
                onSuccess: () => {
                  context.pop()
                  close()
                  notification(
                    t("Success"),
                    t("Price overrides updated"),
                    "success"
                  )
                },
              }
            )
          }}
        />
      ),
    })

  return (
    <LayeredModal isLargeModal context={context} handleClose={close}>
      <Modal.Body className="flex h-[calc(100vh-134px)] flex-col">
        <Modal.Header handleClose={close}>
          <h1 className="inter-xlarge-semibold">
            Price overrides{" "}
            <span className="text-grey-50 inter-xlarge-regular truncate">
              ({product.title})
            </span>
          </h1>
        </Modal.Header>

        <Modal.Content className="flex-1">
          <CollapsibleTree>
            <CollapsibleTree.Parent>
              <div>
                <img
                  src={product.thumbnail || undefined}
                  className="rounded-base h-5 w-4"
                />
              </div>
              <span className="inter-small-semibold">{product.title}</span>
            </CollapsibleTree.Parent>
            <CollapsibleTree.Content>
              {product.variants.map((variant) => (
                <CollapsibleTree.Leaf>
                  <ProductVariantLeaf
                    key={variant.id}
                    onClick={getOnClick(variant)}
                    variant={variant}
                    prices={variant.prices.filter((pr) => pr.price_list_id)}
                  />
                </CollapsibleTree.Leaf>
              ))}
            </CollapsibleTree.Content>
          </CollapsibleTree>
        </Modal.Content>

        <Modal.Footer>
          <div className="flex h-8 w-full justify-end">
            <Button
              variant="ghost"
              className="text-small rounded-rounded mr-2 w-32 justify-center"
              size="large"
              onClick={close}
            >
              {t("Cancel")}
            </Button>
            <Button
              disabled
              size="large"
              className="text-small rounded-rounded w-32 justify-center"
              variant="primary"
            >
              {t("Save")}
            </Button>
          </div>
        </Modal.Footer>
      </Modal.Body>
    </LayeredModal>
  )
}

export default EditPricesOverridesModal
