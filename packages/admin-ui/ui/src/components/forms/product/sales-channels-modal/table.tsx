import { SalesChannel } from "@medusajs/medusa"
import clsx from "clsx"
import React, { useMemo } from "react"
import { TableInstance } from "react-table"
import Button from "../../../fundamentals/button"
import PlusIcon from "../../../fundamentals/icons/plus-icon"
import IndeterminateCheckbox from "../../../molecules/indeterminate-checkbox"
import { useLayeredModal } from "../../../molecules/modal/layered-modal"
import Table from "../../../molecules/table"
import TableContainer from "../../../organisms/table-container"
import { useAddChannelsModalScreen } from "./add-screen"
import { useTranslation } from "react-i18next"
type SalesChannelsTableProps = {
  count: number
  limit: number
  offset: number
  setOffset: (offset: number) => void
  setQuery: (query: string) => void
  setSelectedRowIds?: (selectedRowIds: string[]) => void
  tableAction?: React.ReactNode
  tableState: TableInstance<SalesChannel>
  isLoading?: boolean
}

type SalesChannelTableActionProps = {
  numberOfSelectedRows: number
  onDeselect: () => void
  onRemove: () => void
}

export const useSalesChannelsTableColumns = () => {
  const { t } = useTranslation()
  const columns = useMemo(
    () => [
      {
        width: 30,
        id: "selection",
        Header: ({ getToggleAllPageRowsSelectedProps }) => (
          <span className="flex w-[30px] justify-center">
            <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
          </span>
        ),
        Cell: ({ row }) => {
          return (
            <span
              onClick={(e) => e.stopPropagation()}
              className="flex w-[30px] justify-center"
            >
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </span>
          )
        },
      },
      {
        Header: t("Title"),
        accessor: t("name"),
      },
      {
        Header: t("Description"),
        accessor: t("description"),
      },
    ],
    []
  )

  return [columns] as const
}

const SalesChannelTable = ({
  count,
  limit,
  offset,
  setOffset,
  setQuery,
  tableState,
  setSelectedRowIds,
  tableAction,
  isLoading,
}: SalesChannelsTableProps) => {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageCount,
    nextPage,
    previousPage,
    // Get the state from the instance
    state: { pageIndex, ...state },
  } = tableState

  React.useEffect(() => {
    if (setSelectedRowIds) {
      setSelectedRowIds(Object.keys(state.selectedRowIds))
    }
  }, [Object.keys(state.selectedRowIds).length])

  const handleNext = () => {
    if (canNextPage) {
      setOffset(offset + limit)
      nextPage()
    }
  }

  const handlePrev = () => {
    if (canPreviousPage) {
      setOffset(Math.max(offset - limit, 0))
      previousPage()
    }
  }

  return (
    <TableContainer
      hasPagination
      pagingState={{
        count: count,
        offset: offset,
        pageSize: offset + rows.length,
        title: "Sales Channels",
        currentPage: pageIndex + 1,
        pageCount: pageCount,
        nextPage: handleNext,
        prevPage: handlePrev,
        hasNext: canNextPage,
        hasPrev: canPreviousPage,
      }}
      numberOfRows={limit}
      isLoading={isLoading}
    >
      <Table
        {...getTableProps()}
        enableSearch
        handleSearch={setQuery}
        tableActions={tableAction}
      >
        <Table.Head>
          {headerGroups?.map((headerGroup) => (
            <Table.HeadRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((col) => (
                <Table.HeadCell {...col.getHeaderProps()}>
                  {col.render("Header")}
                </Table.HeadCell>
              ))}
            </Table.HeadRow>
          ))}
        </Table.Head>
        <Table.Body {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row)
            return (
              <Table.Row color={"inherit"} {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <Table.Cell {...cell.getCellProps()}>
                      {cell.render("Cell")}
                    </Table.Cell>
                  )
                })}
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </TableContainer>
  )
}

export const SalesChannelTableActions = ({
  numberOfSelectedRows,
  onDeselect,
  onRemove,
}: SalesChannelTableActionProps) => {
  const addChannelModalScreen = useAddChannelsModalScreen()

  const showAddChannels = !!numberOfSelectedRows

  const classes = {
    "translate-y-[-42px]": !showAddChannels,
    "translate-y-[0px]": showAddChannels,
  }

  const { push } = useLayeredModal()
  const { t } = useTranslation()

  return (
    <div className="space-x-xsmall flex h-[34px] overflow-hidden">
      <div className={clsx("transition-all duration-200", classes)}>
        <div className="mb-2 flex h-[34px] items-center divide-x">
          <span className="inter-small-regular text-grey-50 mr-3">
            {numberOfSelectedRows} {t("Selected")}
          </span>
          <div className="space-x-xsmall flex pl-3">
            <Button
              onClick={onDeselect}
              size="small"
              variant="ghost"
              className="border-grey-20 border"
            >
              {t("Deselect")}
            </Button>
            <Button
              onClick={onRemove}
              size="small"
              variant="ghost"
              className="border-grey-20 border text-rose-50"
            >
              {t("Remove")}
            </Button>
          </div>
        </div>
        <div className="flex h-[34px] justify-end">
          <Button
            size="small"
            variant="ghost"
            className="border-grey-20 border"
            onClick={() => push(addChannelModalScreen)}
          >
            <PlusIcon size={20} /> {t("Add Channels")}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SalesChannelTable
