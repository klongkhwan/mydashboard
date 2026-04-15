"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  HeaderGroup,
  Header,
  Row,
  Cell,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  totalCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loading?: boolean
  emptyState?: React.ReactNode
  className?: string
  /**
   * If true (default), pagination logic happens on the backend.
   * If false, this component handles slicing the data array locally.
   */
  manualPagination?: boolean
}

export function ReusableDataTable<TData, TValue>({
  columns,
  data,
  totalCount: externalTotalCount,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyState,
  className,
  manualPagination = true,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: manualPagination,
    pageCount: manualPagination && externalTotalCount ? Math.ceil(externalTotalCount / pageSize) : undefined,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: pageSize,
      },
    },
  })

  // Determine total items and pages based on mode
  const totalItems = manualPagination ? (externalTotalCount ?? data.length) : data.length
  const totalPages = manualPagination 
    ? (externalTotalCount ? Math.ceil(externalTotalCount / pageSize) : 1)
    : Math.ceil(data.length / pageSize)

  // Actual rows to display
  const rows = manualPagination 
    ? table.getRowModel().rows 
    : table.getPaginationRowModel().rows
  
  // Final Redesign: Standard Data Table Logic + Spotify Branding
  const renderPaginationItems = () => {
    const items = []
    const siblingCount = 1

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <button
              onClick={(e) => {
                e.preventDefault()
                onPageChange?.(i)
                if (!manualPagination) table.setPageIndex(i - 1)
              }}
              className={cn(
                "h-9 px-3 min-w-[36px] rounded-md border border-white/10 font-black text-[11px] transition-all",
                page === i 
                  ? "bg-primary text-black border-primary shadow-play" 
                  : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white hover:bg-[#2a2a2a]"
              )}
            >
              {i}
            </button>
          </PaginationItem>
        )
      }
    } else {
      const leftSiblingIndex = Math.max(page - siblingCount, 1)
      const rightSiblingIndex = Math.min(page + siblingCount, totalPages)

      const showLeftDots = leftSiblingIndex > 2
      const showRightDots = rightSiblingIndex < totalPages - 2

      // First Page
      items.push(
        <PaginationItem key={1}>
          <button
            onClick={(e) => {
              e.preventDefault()
              onPageChange?.(1)
              if (!manualPagination) table.setPageIndex(0)
            }}
            className={cn(
              "h-9 px-3 min-w-[36px] rounded-md border border-white/10 font-black text-[11px]",
              page === 1 ? "bg-primary text-black" : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white"
            )}
          >
            1
          </button>
        </PaginationItem>
      )

      if (showLeftDots) {
        items.push(<PaginationEllipsis key="left-dots" className="text-[#b3b3b3]" />)
      }

      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        if (i === 1 || i === totalPages) continue
        items.push(
          <PaginationItem key={i}>
            <button
              onClick={(e) => {
                e.preventDefault()
                onPageChange?.(i)
                if (!manualPagination) table.setPageIndex(i - 1)
              }}
              className={cn(
                "h-9 px-3 min-w-[36px] rounded-md border border-white/10 font-black text-[11px]",
                page === i ? "bg-primary text-black" : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white"
              )}
            >
              {i}
            </button>
          </PaginationItem>
        )
      }

      if (showRightDots) {
        items.push(<PaginationEllipsis key="right-dots" className="text-[#b3b3b3]" />)
      }

      // Last Page
      items.push(
        <PaginationItem key={totalPages}>
          <button
            onClick={(e) => {
              e.preventDefault()
              onPageChange?.(totalPages)
              if (!manualPagination) table.setPageIndex(totalPages - 1)
            }}
            className={cn(
              "h-9 px-3 min-w-[36px] rounded-md border border-white/10 font-black text-[11px]",
              page === totalPages ? "bg-primary text-black" : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white"
            )}
          >
            {totalPages}
          </button>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Table Container */}
      <div className="bg-[#181818]/40 rounded-lg overflow-hidden border border-white/5 backdrop-blur-sm shadow-heavy">
        <Table>
          <TableHeader className="bg-[#121212]/50 border-b border-white/5">
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header: Header<TData, unknown>) => {
                  return (
                    <TableHead key={header.id} className="text-spotify-label h-12 py-0">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center border-none">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest">Loading data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-white/5 border-none group transition-colors"
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                    <TableCell key={cell.id} className="py-2 border-none">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center border-none">
                  {emptyState || (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-spotify-muted font-bold text-sm">No results found.</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Redesigned Footer - Matching Request Structure but with Site CI Colors */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2 py-4">
        {/* Left: Show [10] entries of X total */}
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-[#b3b3b3]">
          <span>Show</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              const newSize = Number(value)
              onPageSizeChange?.(newSize)
              onPageChange?.(1)
              if (!manualPagination) {
                table.setPageSize(newSize)
                table.setPageIndex(0)
              }
            }}
          >
            <SelectTrigger className="h-9 w-20 bg-[#1f1f1f] border border-white/10 text-white font-bold rounded-md focus:ring-0">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent className="bg-[#282828] border-white/10 text-white">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 focus:bg-white/10">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="hidden sm:inline">entries of {totalItems} total</span>
        </div>

        {/* Right: Pagination Controls */}
        <div className="flex items-center gap-2">
          <Pagination className="w-fit mx-0">
            <PaginationContent className="gap-1.5">
              <PaginationItem>
                <button
                  disabled={page === 1}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) {
                      const newPage = page - 1
                      onPageChange?.(newPage)
                      if (!manualPagination) table.setPageIndex(newPage - 1)
                    }
                  }}
                  className={cn(
                    "h-9 px-4 rounded-md border border-white/10 text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                    page === 1 
                      ? "bg-transparent text-[#333333] border-white/5 cursor-not-allowed" 
                      : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white hover:bg-[#2a2a2a] active:scale-95"
                  )}
                >
                  PREV
                </button>
              </PaginationItem>
              
              {renderPaginationItems()}

              <PaginationItem>
                <button
                  disabled={page === totalPages}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < totalPages) {
                      const newPage = page + 1
                      onPageChange?.(newPage)
                      if (!manualPagination) table.setPageIndex(newPage - 1)
                    }
                  }}
                  className={cn(
                    "h-9 px-4 rounded-md border border-white/10 text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                    page === totalPages 
                      ? "bg-transparent text-[#333333] border-white/5 cursor-not-allowed"
                      : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white hover:bg-[#2a2a2a] active:scale-95"
                  )}
                >
                  NEXT
                </button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
