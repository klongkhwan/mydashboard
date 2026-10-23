"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { TrendingUp, TrendingDown, Calendar, DollarSign, Filter, RefreshCw } from "lucide-react"
import { ModernPageLoading } from "@/components/ui/modern-loader"
import { fetchDualInvestmentProjects, DualInvestmentProject, DualInvestmentFilters } from "@/lib/dual-investment"
import { DualInvestmentCalculator } from "./DualInvestmentCalculator"
import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { formatDateDDMMYYYY } from "@/components/dashboard/format"
import { type ColumnDef, type Row } from "@tanstack/react-table"
import { cn } from "@/lib/utils"

const COINS = ["ETH", "BTC", "BNB", "SOL"]
const DURATION_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "1", label: "1 Day" },
  { value: "3", label: "< 3 Days" },
  { value: "7", label: "< 7 Days" },
  { value: "15", label: "15 Days" },
  { value: "15-30", label: "15-30 Days" },
  { value: "30-60", label: "30-60 Days" },
  { value: "60+", label: "> 60 Days" },
]

export function DualInvestmentTab() {
  const [projects, setProjects] = useState<DualInvestmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showCalculator, setShowCalculator] = useState(false)
  const [selectedProject, setSelectedProject] = useState<DualInvestmentProject | null>(null)
  const [filters, setFilters] = useState<DualInvestmentFilters>({
    coins: ["ETH"],
    projectType: "DOWN",
    duration: "ALL",
    pageIndex: 1,
    pageSize: 10,
  })

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetchDualInvestmentProjects(filters)
      if (response.code === "000000") {
        setProjects(response.data.list)
        setTotal(parseInt(response.data.total))
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [filters])

  const handleCoinChange = (coin: string) => {
    setFilters(prev => ({
      ...prev,
      coins: [coin], // Radio button - only one selection
      pageIndex: 1
    }))
  }

  const handleProjectTypeChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      projectType: value as "UP" | "DOWN",
      pageIndex: 1
    }))
  }

  const handleDurationChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      duration: value as any,
      pageIndex: 1
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      pageIndex: page
    }))
  }

  const closeCalculator = () => {
    setShowCalculator(false)
    setSelectedProject(null)
  }

  const handleRefresh = () => {
    fetchProjects()
  }

  const columns = useMemo<ColumnDef<DualInvestmentProject>[]>(() => [
    {
      accessorKey: "targetAsset",
      header: "Target Asset",
      cell: ({ row }: { row: Row<DualInvestmentProject> }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{row.original.targetAsset}</span>
          <Badge className="bg-surface-hover text-muted-foreground border-none text-[10px] font-bold uppercase px-2 py-0.5">
            {row.original.underlying}
          </Badge>
        </div>
      )
    },
    {
      accessorKey: "strikePrice",
      header: "Strike Price",
      cell: ({ row }: { row: Row<DualInvestmentProject> }) => (
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-spotify-muted" />
          <span className="font-bold text-white tabular-nums">
            {parseFloat(row.original.strikePrice).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      accessorKey: "apr",
      header: "APR",
      cell: ({ row }: { row: Row<DualInvestmentProject> }) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-primary tabular-nums">
            {(parseFloat(row.original.apr) * 100).toFixed(2)}%
          </span>
        </div>
      )
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }: { row: Row<DualInvestmentProject> }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-spotify-muted" />
          <span className="text-spotify-muted">{row.original.duration} day{row.original.duration !== "1" ? "s" : ""}</span>
        </div>
      )
    },
    {
      accessorKey: "settleTime",
      header: "Settlement Date",
      cell: ({ row }: { row: Row<DualInvestmentProject> }) => (
        <span className="text-spotify-muted tabular-nums">
          {formatDateDDMMYYYY(new Date(parseInt(row.original.settleTime)))}
        </span>
      )
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: { row: Row<DualInvestmentProject> }) => (
        <Badge
          className={cn(
            "flex items-center gap-1.5 w-fit cursor-pointer hover:shadow-play transition-all px-3 py-1 text-[10px] font-black uppercase tracking-wider border-none",
            row.original.type === "UP"
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-black"
          )}
          onClick={() => handleTypeClick(row.original)}
        >
          {row.original.type === "UP" ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {row.original.type === "UP" ? "Sell High" : "Buy Low"}
        </Badge>
      )
    }
  ], [])

  const handleTypeClick = (project: DualInvestmentProject) => {
    setSelectedProject(project)
    setShowCalculator(true)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-spotify-title">Dual Investment</h2>
          <p className="text-spotify-muted mt-2">Maximize your returns with automated dual investment strategies</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="pill-secondary"
            size="sm"
            className="bg-secondary hover:bg-surface-hover text-white"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => window.open('https://www.binance.com/en/dual-investment', '_blank')}
            variant="pill-secondary"
            size="sm"
            className="bg-secondary hover:bg-surface-hover text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2 text-primary" />
            Binance
          </Button>
          <Button
            onClick={() => window.open('https://www.bybit.com/en/earn/dual-asset-mining', '_blank')}
            variant="pill-secondary"
            size="sm"
            className="bg-secondary hover:bg-surface-hover text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2 text-primary" />
            Bybit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-spotify border border-white/5 bg-card/60 shadow-heavy backdrop-blur-md">
        <CardContent className="p-4 sm:p-8">
          <div className="flex flex-wrap items-end gap-10">
            {/* Coin Selection */}
            <div className="space-y-4">
              <label className="text-spotify-label">Select Coin</label>
              <RadioGroup
                value={filters.coins[0]}
                onValueChange={handleCoinChange}
                className="flex flex-wrap gap-6"
              >
                {COINS.map(coin => (
                  <div key={coin} className="flex items-center space-x-2">
                    <RadioGroupItem value={coin} id={coin} className="border-white/20 text-primary focus:ring-primary h-5 w-5" />
                    <label htmlFor={coin} className="text-sm font-bold text-white cursor-pointer uppercase tracking-wider">
                      {coin}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Order Type */}
            <div className="space-y-4">
              <label className="text-spotify-label">Order Type</label>
              <ToggleGroup
                type="single"
                value={filters.projectType}
                onValueChange={handleProjectTypeChange}
                className="flex flex-wrap gap-2"
              >
                <ToggleGroupItem
                  value="DOWN"
                  className="btn-pill h-9 px-4 text-[11px] font-black uppercase tracking-widest data-[state=on]:bg-primary data-[state=on]:text-black hover:bg-white/5 border border-white/5 transition-all"
                >
                  <TrendingDown className="w-3.5 h-3.5 mr-2" />
                  Buy Low
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="UP"
                  className="btn-pill h-9 px-4 text-[11px] font-black uppercase tracking-widest data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground hover:bg-white/5 border border-white/5 transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-2" />
                  Sell High
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Duration */}
            <div className="space-y-4 w-full min-w-0 lg:flex-1 lg:min-w-64">
              <label className="text-spotify-label">Duration</label>
              <div className="flex flex-wrap gap-2">
                <ToggleGroup
                  type="single"
                  value={filters.duration}
                  onValueChange={handleDurationChange}
                  className="flex flex-wrap gap-2"
                >
                  {DURATION_OPTIONS.map(option => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      className="btn-pill h-8 px-4 text-[10px] font-bold uppercase tracking-widest data-[state=on]:bg-white data-[state=on]:text-black hover:bg-white/5 border border-white/5 transition-all"
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table using ReusableDataTable */}
      <ReusableDataTable
        columns={columns}
        data={projects}
        loading={loading}
        totalCount={total}
        page={filters.pageIndex}
        pageSize={filters.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={(newSize) => setFilters(prev => ({ ...prev, pageSize: newSize, pageIndex: 1 }))}
        manualPagination={true}
      />

      {/* Calculator Modal */}
      <DualInvestmentCalculator
        isOpen={showCalculator}
        onClose={closeCalculator}
        project={selectedProject}
      />
    </div>
  )
}
