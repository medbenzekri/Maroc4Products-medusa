import { useTranslation } from "react-i18next"
import FocusModal from "../../../components/molecules/modal/focus-modal"
import Accordion from "../../../components/organisms/accordion"
import FormHeader from "./form-header"
import Configuration from "./sections/configuration"
import General from "./sections/general"
import Prices from "./sections/prices"
import Type from "./sections/type"
import { PriceListFormProps, ViewType } from "./types"

const PriceListForm = (props: PriceListFormProps) => {
  const { t } = useTranslation()
  return (
    <FocusModal>
      <FocusModal.Header>
        <FormHeader {...props} />
      </FocusModal.Header>
      <FocusModal.Main>
        <div className="mb-[25%] flex justify-center">
          <div className="medium:w-7/12 large:w-6/12 small:w-4/5 w-full pt-16">
            <h1 className="inter-xlarge-semibold mb-[28px]">
              {props.viewType === ViewType.CREATE
                ? t("Create new price list")
                : t("Edit price list")}
            </h1>
            <Accordion type="multiple" defaultValue={["type"]}>
              <Type />
              <General />
              <Configuration />
              {props.viewType !== ViewType.EDIT_DETAILS && (
                <Prices
                  isEdit={props.viewType !== ViewType.CREATE}
                  id={props.id}
                />
              )}
            </Accordion>
          </div>
        </div>
      </FocusModal.Main>
    </FocusModal>
  )
}

export default PriceListForm
