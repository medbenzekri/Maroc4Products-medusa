import { ProductType } from "@medusajs/medusa"
import { useMemo } from "react"
import { Column, HeaderGroup, Row } from "react-table"
import { Translation } from "react-i18next"
import SortingIcon from "../../../../../../components/fundamentals/icons/sorting-icon"
import Table from "../../../../../../components/molecules/table"

export const TypeRow = ({ row }: { row: Row<ProductType> }) => {
  return (
    <Table.Row {...row.getRowProps()}>
      {row.cells.map((cell) => {
        return (
          <Table.Cell {...cell.getCellProps()}>
            {cell.render("Cell")}
          </Table.Cell>
        )
      })}
    </Table.Row>
  )
}

export const TypesHeader = ({
  headerGroup,
}: {
  headerGroup: HeaderGroup<ProductType>
}) => {
  return (
    <Table.HeadRow {...headerGroup.getHeaderGroupProps()}>
      {headerGroup.headers.map((col) => (
        <Table.HeadCell
          className="w-[100px]"
          {...col.getHeaderProps(col.getSortByToggleProps())}
        >
          {col.render("Header")}
        </Table.HeadCell>
      ))}
    </Table.HeadRow>
  )
}

export const useTypesColumns = () => {
  const columns = useMemo<Column<ProductType>[]>(() => {
    return [
      {
        Header: () => (
          <Translation>
            {(t) => (
              <div className="flex min-w-[626px] items-center gap-1">
                {t("Type")} <SortingIcon size={16} />
              </div>
            )}
          </Translation>
        ),
        accessor: "value",
        Cell: ({ row: { original } }) => {
          return <span>{original.value}</span>
        },
      },
    ]
  }, [])

  return columns
}
