import { useTranslation } from "react-i18next"
import { NestedForm } from "../../../../../utils/nested-form"
import PricesForm, { PricesFormType } from "../../../general/prices-form"

type Props = {
  form: NestedForm<PricesFormType>
}

const VariantPricesForm = ({ form }: Props) => {
  const { t } = useTranslation()
  return (
    <div>
      <p className="inter-base-regular text-grey-50">
        {t("Configure the pricing for this variant.")}
      </p>
      <div className="pt-large">
        <PricesForm form={form} />
      </div>
    </div>
  )
}

export default VariantPricesForm
