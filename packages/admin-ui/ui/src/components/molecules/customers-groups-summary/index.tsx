import { sortBy } from "lodash"

import { CustomerGroup } from "@medusajs/medusa"
import { useTranslation } from "react-i18next"

/**
 * Customers Associated Groups props
 */
interface P {
  groups: CustomerGroup[]
}

/*
 * Render a summary of groups to which the customer belongs
 */
function CustomersGroupsSummary(props: P) {
  const { t } = useTranslation()
  const groups = sortBy(props.groups, "name")
  if (!groups.length) {
    return null
  }

  const left = groups.length - 1
  const leadName = groups[0].name
  const allGroups = groups.map((g) => g.name).join(", ")

  return (
    <div title={allGroups} className="text-small">
      <span>{leadName}</span>
      {!!left && (
        <span className="text-grey-40">
          {" "}
          + {left} {t("more")}
        </span>
      )}
    </div>
  )
}

export default CustomersGroupsSummary
