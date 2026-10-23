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
import { Button } from "@/components/ui/button"
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
            <Button type="button" variant="secondary"
              aria-current={page === i ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault()
                onPageChange?.(i)
                if (!manualPagination) table.setPageIndex(i - 1)
              }}
              className={cn(
                "h-9 px-3 min-w-[36px] rounded-md border border-border font-black text-[11px] transition-all",
                page === i 
                  ? "bg-primary text-black border-primary shadow-play" 
                  : "bg-secondary text-muted-foreground hover:text-white hover:bg-surface-hover"
              )}
            >
              {i}
            </Button>
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
          <Button type="button" variant="secondary"
            aria-current={page === 1 ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault()
              onPageChange?.(1)
              if (!manualPagination) table.setPageIndex(0)
            }}
            className={cn(
              "h-9 px-3 min-w-[36px] rounded-md border border-border font-black text-[11px]",
              page === 1 ? "bg-primary text-black" : "bg-secondary text-muted-foreground hover:text-white"
            )}
          >
            1
          </Button>
        </PaginationItem>
      )

      if (showLeftDots) {
        items.push(<PaginationEllipsis key="left-dots" className="text-muted-foreground" />)
      }

      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        if (i === 1 || i === totalPages) continue
        items.push(
          <PaginationItem key={i}>
            <Button type="button" variant="secondary"
              aria-current={page === i ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault()
                onPageChange?.(i)
                if (!manualPagination) table.setPageIndex(i - 1)
              }}
              className={cn(
                "h-9 px-3 min-w-[36px] rounded-md border border-border font-black text-[11px]",
                page === i ? "bg-primary text-black" : "bg-secondary text-muted-foreground hover:text-white"
              )}
            >
              {i}
            </Button>
          </PaginationItem>
        )
      }

      if (showRightDots) {
        items.push(<PaginationEllipsis key="right-dots" className="text-muted-foreground" />)
      }

      // Last Page
      items.push(
        <PaginationItem key={totalPages}>
          <Button type="button" variant="secondary"
            aria-current={page === totalPages ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault()
              onPageChange?.(totalPages)
              if (!manualPagination) table.setPageIndex(totalPages - 1)
            }}
            className={cn(
              "h-9 px-3 min-w-[36px] rounded-md border border-border font-black text-[11px]",
              page >= totalPages ? "bg-primary text-black" : "bg-secondary text-muted-foreground hover:text-white"
            )}
          >
            {totalPages}
          </Button>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Table Container */}
      <div className="bg-card/40 rounded-lg overflow-hidden border border-border backdrop-blur-sm shadow-card">
        <Table aria-busy={Boolean(loading)}>
          <TableHeader className="bg-background/50 border-b border-border">
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
                  <div role="status" className="flex flex-col items-center gap-3">
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
                  className="hover:bg-muted/50 border-none group transition-colors"
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
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
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
            <SelectTrigger aria-label="Rows per page" className="h-9 w-20 bg-secondary border border-border text-white font-bold rounded-md ">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
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
                <Button type="button" variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1) {
                      const newPage = page - 1
                      onPageChange?.(newPage)
                      if (!manualPagination) table.setPageIndex(newPage - 1)
                    }
                  }}
                  className={cn(
                    "h-9 px-4 rounded-md border border-border text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                    page === 1 
                      ? "bg-transparent text-muted-foreground border-border"
                      : "bg-secondary text-muted-foreground hover:text-white hover:bg-surface-hover "
                  )}
                >
                  PREV
                </Button>
              </PaginationItem>
              
              {renderPaginationItems()}

              <PaginationItem>
                <Button type="button" variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < totalPages) {
                      const newPage = page + 1
                      onPageChange?.(newPage)
                      if (!manualPagination) table.setPageIndex(newPage - 1)
                    }
                  }}
                  className={cn(
                    "h-9 px-4 rounded-md border border-border text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                    page >= totalPages
                      ? "bg-transparent text-muted-foreground border-border"
                      : "bg-secondary text-muted-foreground hover:text-white hover:bg-surface-hover "
                  )}
                >
                  NEXT
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
