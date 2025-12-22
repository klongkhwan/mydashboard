"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import {
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Clock,
  Heart,
  Brain
} from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { ModernPageLoading } from "@/components/ui/modern-loader"
import { Trade, TradeFilters, Market, TradeStatus, EmotionType } from "@/types/trading"
import { getTrades, deleteTrade, getUniqueSymbols, getUniqueTimeframes } from "@/lib/trading"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { TradeModal } from "./trade-modal"

interface TradeListProps {
  trades?: Trade[]
  loading?: boolean
  onTradeUpdated?: () => void
  onTradeDeleted?: () => void
  onRefresh?: () => void
  onEditTrade?: (id: string) => void
  refreshTrigger?: number
}

export function TradeList({
  trades: initialTrades,
  loading: initialLoading,
  onTradeUpdated,
  onTradeDeleted,
  onRefresh,
  onEditTrade,
  refreshTrigger = 0
}: TradeListProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades || [])
  const [loading, setLoading] = useState(initialLoading || false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<TradeFilters>({})
  const [uniqueSymbols, setUniqueSymbols] = useState<string[]>([])
  const [uniqueTimeframes, setUniqueTimeframes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Fetch on mount or when refreshTrigger changes
  useEffect(() => {
    fetchTrades()
    fetchFilterOptions()
  }, [refreshTrigger])

  // Update trades when initialTrades prop changes (for backward compatibility)
  useEffect(() => {
    if (initialTrades) {
      setTrades(initialTrades)
    }
  }, [initialTrades])

  // Update loading when initialLoading prop changes
  useEffect(() => {
    if (initialLoading !== undefined) {
      setLoading(initialLoading)
    }
  }, [initialLoading])

  const fetchTrades = async (additionalFilters?: TradeFilters) => {
    try {
      setLoading(true)
      const data = await getTrades({ ...filters, ...additionalFilters })
      setTrades(data)
    } catch (error) {
      console.error("Error fetching trades:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterOptions = async () => {
    try {
      const [symbols, timeframes] = await Promise.all([
        getUniqueSymbols(),
        getUniqueTimeframes()
      ])
      setUniqueSymbols(symbols)
      setUniqueTimeframes(timeframes)
    } catch (error) {
      console.error("Error fetching filter options:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTrade(id)
      setTrades(trades.filter(trade => trade.id !== id))
      onTradeDeleted?.()
    } catch (error) {
      console.error("Error deleting trade:", error)
    }
  }

  const handleEdit = (id: string) => {
    if (onEditTrade) {
      onEditTrade(id)
    } else {
      setEditingTradeId(id)
      setShowEditModal(true)
    }
  }

  const handleTradeUpdated = () => {
    fetchTrades()
    setShowEditModal(false)
    setEditingTradeId(null)
    onTradeUpdated?.()
  }

  const handleRefresh = () => {
    fetchTrades()
    fetchFilterOptions()
    onRefresh?.()
  }

  const handleFilter = (newFilters: TradeFilters) => {
    setFilters(newFilters)
    fetchTrades(newFilters)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    handleFilter({ ...filters, search: term })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Convert UTC date to Thailand timezone (Asia/Bangkok)
    const utcDate = new Date(dateString)
    const thaiDate = toZonedTime(utcDate, 'Asia/Bangkok')
    return format(thaiDate, 'dd MMM yyyy, HH:mm น.', { locale: th })
  }

  const getStatusBadge = (status: TradeStatus) => {
    const variants = {
      open: "bg-blue-100 text-blue-800 border-blue-200",
      closed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    }
    const labels = {
      open: "เปิด",
      closed: "ปิดแล้ว",
      cancelled: "ยกเลิก"
    }
    return (
      <Badge className={variants[status]} variant="outline">
        {labels[status]}
      </Badge>
    )
  }

  const getMarketBadge = (market: Market) => {
    const variants = {
      spot: "bg-green-100 text-green-800 border-green-200",
      futures: "bg-orange-100 text-orange-800 border-orange-200",
      margin: "bg-purple-100 text-purple-800 border-purple-200"
    }
    const labels = {
      spot: "Spot",
      futures: "Futures",
      margin: "Margin"
    }
    return (
      <Badge className={variants[market]} variant="outline">
        {labels[market]}
      </Badge>
    )
  }

  const getEmotionBadge = (emotion?: EmotionType) => {
    if (!emotion) return null

    const emotionConfig = {
      greedy: { label: "โลภ", color: "text-green-600", icon: "🤑" },
      fearful: { label: "กลัว", color: "text-red-600", icon: "😨" },
      confident: { label: "มั่นใจ", color: "text-blue-600", icon: "😎" },
      anxious: { label: "กังวล", color: "text-orange-600", icon: "😰" },
      neutral: { label: "เป็นกลาง", color: "text-gray-600", icon: "😐" },
      excited: { label: "ตื่นเต้น", color: "text-purple-600", icon: "🤩" },
      disappointed: { label: "ผิดหวัง", color: "text-indigo-600", icon: "😞" },
      calm: { label: "สงบ", color: "text-teal-600", icon: "😌" }
    }

    const config = emotionConfig[emotion]
    return (
      <span className={`flex items-center gap-1 text-xs ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const getProfitLossClass = (profitLoss?: number) => {
    if (profitLoss === null || profitLoss === undefined) return ""
    return profitLoss > 0 ? "text-green-600 font-semibold" : profitLoss < 0 ? "text-red-600 font-semibold" : ""
  }

  // Quick Filter Logic
  const filteredTrades = trades.filter(trade => {
    // 1. Filter by Quick Tabs first
    if (activeTab === "open" && trade.status !== "open") return false
    if (activeTab === "closed" && trade.status !== "closed") return false
    if (activeTab === "winning" && (trade.profit_loss === undefined || trade.profit_loss <= 0)) return false
    if (activeTab === "losing" && (trade.profit_loss === undefined || trade.profit_loss >= 0)) return false

    // 2. Filter by Search Term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        trade.symbol.toLowerCase().includes(searchLower) ||
        trade.entry_reason?.toLowerCase().includes(searchLower) ||
        trade.exit_reason?.toLowerCase().includes(searchLower) ||
        trade.learning_note?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Quick Filter Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto overflow-x-auto flex justify-start">
          <TabsTrigger value="all" className="flex-1 sm:flex-none min-w-[80px]">ทั้งหมด</TabsTrigger>
          <TabsTrigger value="open" className="flex-1 sm:flex-none min-w-[80px] data-[state=active]:text-blue-500">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            สถานะเปิด
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex-1 sm:flex-none min-w-[80px] data-[state=active]:text-green-500">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            สถานะปิด
          </TabsTrigger>
          <TabsTrigger value="winning" className="flex-1 sm:flex-none min-w-[80px] data-[state=active]:text-green-500">
            <TrendingUp className="w-3 h-3 mr-2 text-green-500" />
            กำไร
          </TabsTrigger>
          <TabsTrigger value="losing" className="flex-1 sm:flex-none min-w-[80px] data-[state=active]:text-red-500">
            <TrendingDown className="w-3 h-3 mr-2 text-red-500" />
            ขาดทุน
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {/* Compact Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">รายการการเทรด</h3>
          <p className="text-sm text-muted-foreground">
            แสดง {filteredTrades.length} จาก {trades.length} รายการ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" />
            ฟิลเตอร์
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="ค้นหาสัญลักษณ์, เหตุผล, บัญชี..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Compact Filters */}
      {showFilters && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <Select onValueChange={(value) => handleFilter({ ...filters, symbol: value === "all" ? undefined : value })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="สัญลักษณ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {uniqueSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilter({ ...filters, market: value === "all" ? undefined : value as Market })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="ตลาด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="spot">Spot</SelectItem>
                <SelectItem value="futures">Futures</SelectItem>
                <SelectItem value="margin">Margin</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilter({ ...filters, status: value === "all" ? undefined : value as TradeStatus })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="open">เปิด</SelectItem>
                <SelectItem value="closed">ปิดแล้ว</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilter({ ...filters, timeframe: value === "all" ? undefined : value })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {uniqueTimeframes.map(timeframe => (
                  <SelectItem key={timeframe} value={timeframe}>{timeframe}</SelectItem>
                ))}
              </SelectContent>
            </Select>


          </div>
        </div>
      )}

      {/* Trade Table */}
      {loading ? (
        <ModernPageLoading />
      ) : filteredTrades.length === 0 ? (
        <div className="text-center p-6">
          <Eye className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-base font-semibold mb-1">ไม่พบข้อมูลการเทรด</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm || Object.keys(filters).length > 0
              ? "ลองปรับฟิลเตอร์หรือคำค้นหา"
              : "เริ่มบันทึกการเทรดแรกของคุณ"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-xs">วันที่เข้า</TableHead>
                  <TableHead className="w-[80px] text-xs">สัญลักษณ์</TableHead>
                  <TableHead className="w-[60px] text-xs">ตลาด</TableHead>
                  <TableHead className="w-[80px] text-right text-xs">ราคาเข้า</TableHead>
                  <TableHead className="w-[80px] text-right text-xs">ราคาออก</TableHead>
                  <TableHead className="w-[80px] text-right text-xs">P&L</TableHead>
                  <TableHead className="w-[60px] text-xs">สถานะ</TableHead>
                  <TableHead className="w-[80px] text-xs hidden sm:table-cell">อารมณ์</TableHead>
                  <TableHead className="w-[80px] text-center text-xs">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => (
                  <TableRow key={trade.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs">
                      <div className="truncate">{formatDate(trade.entry_date)}</div>
                      {trade.exit_date && trade.status === 'closed' && (
                        <div className="text-xs text-muted-foreground">
                          ออก: {formatDate(trade.exit_date)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm truncate">{trade.symbol}</div>
                      {trade.timeframe && (
                        <div className="text-xs text-muted-foreground">{trade.timeframe}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getMarketBadge(trade.market)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatPrice(trade.entry_price)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {trade.exit_price ? formatPrice(trade.exit_price) : "-"}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${getProfitLossClass(trade.profit_loss)}`}>
                      {trade.profit_loss !== null && trade.profit_loss !== undefined ? formatCurrency(trade.profit_loss) : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(trade.status)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1">
                        {trade.entry_emotion && (
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {getEmotionBadge(trade.entry_emotion)}
                          </div>
                        )}
                        {trade.exit_emotion && trade.status === 'closed' && (
                          <div className="flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            {getEmotionBadge(trade.exit_emotion)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-base">รายละเอียดการเทรด</DialogTitle>
                              <DialogDescription className="text-sm">
                                {trade.symbol} - {formatDate(trade.entry_date)}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Basic Information */}
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  ข้อมูลพื้นฐาน
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <strong>สัญลักษณ์:</strong>
                                    <span>{trade.symbol}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <strong>ตลาด:</strong>
                                    {getMarketBadge(trade.market)}
                                  </div>
                                  <div className="flex justify-between">
                                    <strong>Timeframe:</strong>
                                    <span>{trade.timeframe || "-"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <strong>สถานะ:</strong>
                                    {getStatusBadge(trade.status)}
                                  </div>
                                  <div className="flex justify-between">
                                    <strong>วันเข้า:</strong>
                                    <span>{formatDate(trade.entry_date)}</span>
                                  </div>
                                  {trade.exit_date && (
                                    <div className="flex justify-between">
                                      <strong>วันออก:</strong>
                                      <span>{formatDate(trade.exit_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Price and Capital */}
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  ราคาและทุน
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <strong>ราคาเข้า:</strong>
                                    <span>{formatPrice(trade.entry_price)}</span>
                                  </div>
                                  {trade.exit_price && (
                                    <div className="flex justify-between">
                                      <strong>ราคาออก:</strong>
                                      <span>{formatPrice(trade.exit_price)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <strong>ขนาดทุน:</strong>
                                    <span>{formatCurrency(trade.capital_amount)}</span>
                                  </div>
                                  {(trade.market === 'futures' || trade.market === 'margin') && (
                                    <>
                                      {trade.position_size && (
                                        <div className="flex justify-between">
                                          <strong>Position Size:</strong>
                                          <span>{trade.position_size}</span>
                                        </div>
                                      )}
                                      {trade.leverage && (
                                        <div className="flex justify-between">
                                          <strong>Leverage:</strong>
                                          <span>{trade.leverage}x</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {trade.profit_loss !== null && trade.profit_loss !== undefined && (
                                    <div className={`flex justify-between font-semibold ${getProfitLossClass(trade.profit_loss)}`}>
                                      <strong>P&L:</strong>
                                      <span>{formatCurrency(trade.profit_loss)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Entry Emotion and Reason */}
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <Heart className="w-4 h-4" />
                                  การเข้าเทรด
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {trade.entry_emotion && (
                                    <div className="flex justify-between">
                                      <strong>อารมณ์:</strong>
                                      {getEmotionBadge(trade.entry_emotion)}
                                    </div>
                                  )}
                                  {trade.entry_reason && (
                                    <div>
                                      <strong className="block mb-1">เหตุผล:</strong>
                                      <p className="text-muted-foreground text-xs bg-muted p-2 rounded">
                                        {trade.entry_reason}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Exit Emotion and Reason */}
                              {(trade.status === 'closed' || trade.exit_emotion || trade.exit_reason) && (
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    การปิดออเดอร์
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    {trade.exit_emotion && (
                                      <div className="flex justify-between">
                                        <strong>อารมณ์:</strong>
                                        {getEmotionBadge(trade.exit_emotion)}
                                      </div>
                                    )}
                                    {trade.exit_reason && (
                                      <div>
                                        <strong className="block mb-1">เหตุผล:</strong>
                                        <p className="text-muted-foreground text-xs bg-muted p-2 rounded">
                                          {trade.exit_reason}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Learning Note */}
                            {trade.learning_note && (
                              <div className="mt-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4" />
                                  สิ่งที่ได้เรียนรู้
                                </h4>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                  {trade.learning_note}
                                </p>
                              </div>
                            )}


                          </DialogContent>
                        </Dialog>

                        <Button variant="ghost" size="sm" onClick={() => handleEdit(trade.id)}>
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base">ยืนยันการลบ</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                คุณแน่ใจหรือไม่ว่าต้องการลบการเทรดนี้?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-sm">ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(trade.id)} className="text-sm">
                                ลบ
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Trade Modal - Only show if onEditTrade is not provided */}
      {!onEditTrade && (
        <TradeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingTradeId(null)
          }}
          tradeId={editingTradeId}
          onSuccess={handleTradeUpdated}
        />
      )}
    </div>
  )
}