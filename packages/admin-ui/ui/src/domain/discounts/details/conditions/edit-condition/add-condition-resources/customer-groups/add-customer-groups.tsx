import { useAdminCustomerGroups } from "medusa-react"
import { useContext, useState } from "react"
import { useTranslation } from "react-i18next"

import Modal from "../../../../../../../components/molecules/modal"
import { SelectableTable } from "../../../../../../../components/templates/selectable-table"
import useQueryFilters from "../../../../../../../hooks/use-query-filters"
import { defaultQueryProps } from "../../../../../new/discount-form/condition-tables/shared/common"
import {
  CustomerGroupsHeader,
  CustomerGroupsRow,
  useGroupColumns,
} from "../../../../../new/discount-form/condition-tables/shared/groups"
import { useEditConditionContext } from "../../edit-condition-provider"
import Button from "../../../../../../../components/fundamentals/button"
import { LayeredModalContext } from "../../../../../../../components/molecules/modal/layered-modal"

const AddCustomerGroupsConditionsScreen = () => {
  const { t } = useTranslation()
  const params = useQueryFilters(defaultQueryProps)

  const { pop } = useContext(LayeredModalContext)

  const [selectedResources, setSelectedResources] = useState<string[]>([])

  const columns = useGroupColumns()

  const { isLoading, count, customer_groups, refetch } = useAdminCustomerGroups(
    params.queryObject,
    {
      keepPreviousData: true,
    }
  )

  const { saveAndClose, saveAndGoBack } = useEditConditionContext()

  return (
    <>
      <Modal.Content>
        <SelectableTable
          options={{
            enableSearch: true,
            immediateSearchFocus: true,
            searchPlaceholder: t("Search..."),
          }}
          resourceName="Groups"
          totalCount={count ?? 0}
          selectedIds={selectedResources}
          data={customer_groups || []}
          columns={columns}
          isLoading={isLoading}
          onChange={(ids) => setSelectedResources(ids)}
          renderRow={CustomerGroupsRow}
          renderHeaderGroup={CustomerGroupsHeader}
          {...params}
        />
      </Modal.Content>
      <Modal.Footer>
        <div className="space-x-xsmall flex w-full justify-end">
          <Button variant="secondary" size="small" onClick={pop}>
            {t("Cancel")}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => saveAndGoBack(selectedResources, () => refetch())}
          >
            {t("Save and go back")}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => saveAndClose(selectedResources)}
          >
            {t("Save and close")}
          </Button>
        </div>
      </Modal.Footer>
    </>
  )
}

export default AddCustomerGroupsConditionsScreen
