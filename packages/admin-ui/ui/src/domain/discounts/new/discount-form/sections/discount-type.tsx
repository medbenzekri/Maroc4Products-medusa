import clsx from "clsx"
import { Controller, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import RadioGroup from "../../../../../components/organisms/radio-group"
import { DiscountRuleType } from "../../../types"
import { useDiscountForm } from "../form/discount-form-context"

const DiscountType = () => {
  const { control } = useDiscountForm()
  const { t } = useTranslation()

  const regions = useWatch({
    control,
    name: "regions",
  })

  return (
    <Controller
      name="rule.type"
      control={control}
      rules={{ required: true }}
      render={({ field: { onChange, value } }) => {
        return (
          <RadioGroup.Root
            value={value}
            onValueChange={onChange}
            className={clsx("gap-base mt-base flex items-center px-1")}
          >
            <RadioGroup.Item
              value={DiscountRuleType.PERCENTAGE}
              className="flex-1"
              label={t("Percentage")}
              description={"Discount applied in %"}
            />
            <RadioGroup.Item
              value={DiscountRuleType.FIXED}
              className="flex-1"
              label={t("Fixed amount")}
              description={t("Discount in whole numbers")}
              disabled={Array.isArray(regions) && regions.length > 1}
              disabledTooltip={t(
                "You can only select one valid region if you want to use the fixed amount type"
              )}
            />
            <RadioGroup.Item
              value={DiscountRuleType.FREE_SHIPPING}
              className="flex-1"
              label={t("Free shipping")}
              description={t("Override delivery amount")}
            />
          </RadioGroup.Root>
        )
      }}
    />
  )
}

export default DiscountType
