"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { TrendingUp, TrendingDown, Calendar, DollarSign, Filter } from "lucide-react"
import { fetchDualInvestmentProjects, DualInvestmentProject, DualInvestmentFilters } from "@/lib/dual-investment"
import { DualInvestmentCalculator } from "./DualInvestmentCalculator"

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

  const totalPages = Math.ceil(total / filters.pageSize)

  const handleTypeClick = (project: DualInvestmentProject) => {
    setSelectedProject(project)
    setShowCalculator(true)
  }

  const closeCalculator = () => {
    setShowCalculator(false)
    setSelectedProject(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dual Investment</h2>
        <Button
          onClick={() => window.open('https://www.binance.com/en/dual-investment', '_blank')}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Binance Dual Investment
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-6">
          {/* Coin Selection */}
          <div className="flex-shrink-0">
            <label className="text-sm font-medium mb-2 block">Select Coin</label>
            <RadioGroup
              value={filters.coins[0]}
              onValueChange={handleCoinChange}
              className="flex gap-3"
            >
              {COINS.map(coin => (
                <div key={coin} className="flex items-center space-x-1">
                  <RadioGroupItem value={coin} id={coin} className="h-4 w-4" />
                  <label htmlFor={coin} className="text-sm font-medium cursor-pointer">
                    {coin}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Order Type */}
          <div className="flex-shrink-0">
            <label className="text-sm font-medium mb-2 block">Order Type</label>
            <ToggleGroup
              type="single"
              value={filters.projectType}
              onValueChange={handleProjectTypeChange}
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem
                value="DOWN"
                className="flex items-center gap-1 text-xs data-[state=on]:bg-green-600 data-[state=on]:text-white hover:bg-green-100 px-2 py-1"
              >
                <TrendingDown className="w-3 h-3" />
                Buy Low
              </ToggleGroupItem>
              <ToggleGroupItem
                value="UP"
                className="flex items-center gap-1 text-xs data-[state=on]:bg-red-600 data-[state=on]:text-white hover:bg-red-100 px-2 py-1"
              >
                <TrendingUp className="w-3 h-3" />
                Sell High
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Duration */}
          <div className="flex-shrink-0 flex-1 min-w-0">
            <label className="text-sm font-medium mb-2 block">Duration</label>
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
                    className="text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-1"
                  >
                    {option.label}
                  </ToggleGroupItem>
                  ))}
              </ToggleGroup>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card className="max-h-[600px] flex flex-col">
        <CardContent className="flex-1 overflow-hidden flex flex-col px-3 py-2">
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No projects found matching your criteria</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto -mt-2 -mb-1">
                <Table className="border-separate border-spacing-y-1">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="py-2">Target Asset</TableHead>
                      <TableHead className="py-2">Strike Price</TableHead>
                      <TableHead className="py-2">APR</TableHead>
                      <TableHead className="py-2">Duration</TableHead>
                      <TableHead className="py-2">Settlement Date</TableHead>
                      <TableHead className="py-2">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-1">
                          <div className="flex items-center gap-2">
                            <span>{project.targetAsset}</span>
                            <Badge variant="secondary" className="text-xs">
                              {project.underlying}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono">
                              {parseFloat(project.strikePrice).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-600">
                              {(parseFloat(project.apr) * 100).toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{project.duration} day{project.duration !== "1" ? "s" : ""}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <span className="text-sm text-muted-foreground">
                            {new Date(parseInt(project.settleTime)).toLocaleDateString('en-GB')}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="secondary"
                            className={`flex items-center gap-1 w-fit cursor-pointer hover:opacity-80 ${
                              project.type === "UP"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-green-100 text-green-800 border-green-200"
                            }`}
                            onClick={() => handleTypeClick(project)}
                          >
                            {project.type === "UP" ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {project.type === "UP" ? "Sell High" : "Buy Low"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-1 flex-shrink-0">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(filters.pageIndex - 1)}
                          className={filters.pageIndex <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1
                        const isCurrentPage = pageNum === filters.pageIndex

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={isCurrentPage}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      {totalPages > 5 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(filters.pageIndex + 1)}
                          className={filters.pageIndex >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculator Modal */}
      <DualInvestmentCalculator
        isOpen={showCalculator}
        onClose={closeCalculator}
        project={selectedProject}
      />
    </div>
  )
}