import { useTranslation } from "react-i18next"
import FormValidator from "../../../../../utils/form-validator"
import InputField from "../../../../../components/molecules/input"
import { NestedForm } from "../../../../../utils/nested-form"

export type GeneralFormType = {
  name: string
}

type Props = {
  form: NestedForm<GeneralFormType>
}

const GeneralForm = ({ form }: Props) => {
  const { t } = useTranslation()
  const {
    register,
    path,
    formState: { errors },
  } = form
  return (
    <div>
      <div className="gap-x-large mb-small grid grid-cols-2">
        <InputField
          label={t("Location name")}
          placeholder={t("Flagship store, warehouse")}
          required
          {...register(path("name"), {
            required: t("Name is required"),
            pattern: FormValidator.whiteSpaceRule("Location name"),
          })}
          errors={errors}
        />
      </div>
    </div>
  )
}

export default GeneralForm
