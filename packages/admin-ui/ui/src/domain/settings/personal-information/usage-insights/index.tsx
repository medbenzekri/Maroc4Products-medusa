import { User } from "@medusajs/medusa"
import { useTranslation } from "react-i18next"
import Badge from "../../../../components/fundamentals/badge"
import Button from "../../../../components/fundamentals/button"
import useToggleState from "../../../../hooks/use-toggle-state"
import { useAdminAnalyticsConfig } from "../../../../services/analytics"
import UsageInsightsModal from "./usage-insights-modal"

type Props = {
  user?: Omit<User, "password_hash">
}

const UsageInsights = ({ user }: Props) => {
  const { analytics_config, isLoading } = useAdminAnalyticsConfig()
  const { state, toggle, close } = useToggleState()
  const { t } = useTranslation()

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="gap-y-2xsmall flex flex-col">
          <div className="gap-x-xsmall flex items-center">
            <h2 className="inter-base-semibold">{t("Usage insights")}</h2>
            {isLoading ? (
              <div className="badge bg-grey-10 h-large w-16 animate-pulse" />
            ) : !analytics_config || analytics_config?.opt_out ? (
              <Badge variant="disabled">{t("Disabled")}</Badge>
            ) : (
              <Badge variant="success">{t("Active")}</Badge>
            )}
          </div>
          <p className="inter-base-regular text-grey-50">
            {t("Share usage insights and help us improve Medusa")}
          </p>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={toggle}
          disabled={!analytics_config}
        >
          {t("Edit preferences")}
        </Button>
      </div>
      {analytics_config && user && (
        <UsageInsightsModal
          open={state}
          onClose={close}
          config={analytics_config}
        />
      )}
    </>
  )
}

export default UsageInsights
