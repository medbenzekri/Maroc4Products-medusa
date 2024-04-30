import { useTranslation } from "react-i18next"
import { SkeletonProvider } from "../../../providers/skeleton-provider"
import Skeleton from "../../atoms/skeleton"
import ArrowLeftIcon from "../../fundamentals/icons/arrow-left-icon"
import ArrowRightIcon from "../../fundamentals/icons/arrow-right-icon"
import { PagingProps } from "./types"
import i18n from "i18next"

type Props = {
  isLoading?: boolean
  pagingState: PagingProps
}

export const TablePagination = ({
  isLoading = false,
  pagingState: {
    title,
    currentPage,
    pageCount,
    pageSize,
    count,
    offset,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
  },
}: Props) => {
  const { t } = useTranslation()
  const soothedOffset = count > 0 ? offset + 1 : 0
  const soothedPageCount = Math.max(1, pageCount)

  return (
    <SkeletonProvider isLoading={isLoading}>
      <div
        className={
          "inter-small-regular text-grey-50 flex w-full justify-between"
        }
      >
        <Skeleton>
          <div dir="auto">
            {t("{soothedOffset} - {pageSize} of {count} {title}", {
              soothedOffset,
              pageSize,
              count,
              title,
            })}
          </div>
        </Skeleton>
        <div className="flex space-x-4">
          <Skeleton>
            <div dir="auto">
              {t("{currentPage} of {soothedPageCount}", {
                currentPage,
                soothedPageCount,
              })}
            </div>
          </Skeleton>
          <div className="flex items-center space-x-4">
            <button
              className={`disabled:text-grey-30 cursor-pointer disabled:cursor-default`}
              disabled={
                i18n.language === "ar"
                  ? !hasNext || isLoading
                  : !hasPrev || isLoading
              }
              onClick={
                i18n.language === "ar" ? () => nextPage() : () => prevPage()
              }
            >
              <ArrowLeftIcon />
            </button>
            <button
              className={`disabled:text-grey-30 cursor-pointer disabled:cursor-default`}
              disabled={
                i18n.language === "ar"
                  ? !hasPrev || isLoading
                  : !hasNext || isLoading
              }
              onClick={
                i18n.language === "ar" ? () => prevPage() : () => nextPage()
              }
            >
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </SkeletonProvider>
  )
}
