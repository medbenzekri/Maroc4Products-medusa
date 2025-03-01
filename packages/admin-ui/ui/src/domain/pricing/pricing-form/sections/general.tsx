import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"
import Switch from "../../../../components/atoms/switch"
import FeatureToggle from "../../../../components/fundamentals/feature-toggle"
import InputField from "../../../../components/molecules/input"
import Accordion from "../../../../components/organisms/accordion"
import { usePriceListForm } from "../form/pricing-form-context"

const General = () => {
  const { t } = useTranslation()
  const { control, register } = usePriceListForm()

  return (
    <Accordion.Item
      forceMountContent
      required
      title={t("General")}
      tooltip={t("General information for the price list.")}
      value="general"
    >
      <div className="gap-y-small group-radix-state-open:mt-5 accordion-margin-transition flex flex-col">
        <InputField
          label={t("Name")}
          required
          placeholder={t("B2B, Black Friday...")}
          {...register("name", { required: "Name is required" })}
        />
        <InputField
          label={t("Description")}
          required
          placeholder={t("For our business partners...")}
          {...register("description", { required: "Description is required" })}
        />
        <FeatureToggle featureFlag="tax_inclusive_pricing">
          <div className="mt-3">
            <div className="flex justify-between">
              <h2 className="inter-base-semibold">
                {t("Tax inclusive prices")}
              </h2>
              <Controller
                control={control}
                name="includes_tax"
                render={({ field: { value, onChange } }) => {
                  return <Switch checked={!!value} onCheckedChange={onChange} />
                }}
              />
            </div>
            <p className="inter-base-regular text-grey-50">
              {t("Choose to make all prices in this list inclusive of tax.")}
            </p>
          </div>
        </FeatureToggle>
      </div>
    </Accordion.Item>
  )
}

export default General
