"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TradeFormNew } from "@/components/trading/trade-form-new"
import { TradeList } from "@/components/trading/trade-list"
import { TradeStats } from "@/components/trading/trade-stats"
import { TradingCalculator } from "@/components/trading/trading-calculator"
import { PlusCircle, TrendingUp, ListTodo, BarChart3, Calculator } from "lucide-react"
import { Trade, TradeFilters } from "@/types/trading"
import { getTrades, calculateTradeStatistics } from "@/lib/trading"

export default function MyTradePage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showNewTradeModal, setShowNewTradeModal] = useState(false)
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCalculatorModal, setShowCalculatorModal] = useState(false)

  const fetchTrades = async () => {
    try {
      setLoading(true)
      const data = await getTrades()
      setTrades(data)
    } catch (error) {
      console.error("Error fetching trades:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  const handleTradeCreated = () => {
    fetchTrades().then(() => {
      setShowNewTradeModal(false)
      // Switch to trades tab to see the new trade
      setActiveTab("trades")
    })
  }

  const handleTradeUpdated = () => {
    fetchTrades().then(() => {
      setShowEditModal(false)
      setEditingTradeId(null)
      // Switch to trades tab to see the updated trade
      setActiveTab("trades")
    })
  }

  const handleTradeDeleted = () => {
    fetchTrades().then(() => {
      // Stay on current tab but ensure data is refreshed
    })
  }

  const handleEditTrade = (id: string) => {
    setEditingTradeId(id)
    setShowEditModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header with Prominent Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Trade</h1>
          <p className="text-muted-foreground">
            บันทึกและติดตามการเทรดของคุณ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCalculatorModal(true)}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 h-12 px-6 text-base"
          >
            <Calculator className="w-5 h-5" />
            Calculate
          </Button>
          <Button
            onClick={() => setShowNewTradeModal(true)}
            size="lg"
            className="flex items-center gap-2 h-12 px-6 text-base"
          >
            <PlusCircle className="w-5 h-5" />
            บันทึกการเทรดใหม่
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="w-4 h-4" />
            ภาพรวม
          </TabsTrigger>
          <TabsTrigger
            value="trades"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ListTodo className="w-4 h-4" />
            รายการทั้งหมด
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">การเทรดทั้งหมด</p>
                  <p className="text-2xl font-bold">{trades.length}</p>
                  <p className="text-xs text-muted-foreground">จากทุกสถานะ</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">กำลังเปิด</p>
                  <p className="text-2xl font-bold">
                    {trades.filter(t => t.status === 'open').length}
                  </p>
                  <p className="text-xs text-muted-foreground">ออเดอร์ที่ยังไม่ปิด</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <PlusCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ปิดแล้ว</p>
                  <p className="text-2xl font-bold">
                    {trades.filter(t => t.status === 'closed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">ออเดอร์ที่ปิดแล้ว</p>
                </div>
                <div className="bg-green-100 p-2 rounded-full">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">สัญลักษณ์ที่เทรด</p>
                  <p className="text-2xl font-bold">
                    {new Set(trades.map(t => t.symbol)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">คู่สกุลเงิน/สินทรัพย์</p>
                </div>
                <ListTodo className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </Card>
          </div>

          <TradeStats trades={trades} />
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <TradeList
            trades={trades}
            loading={loading}
            onTradeUpdated={handleTradeUpdated}
            onTradeDeleted={handleTradeDeleted}
            onRefresh={fetchTrades}
            onEditTrade={handleEditTrade}
          />
        </TabsContent>

              </Tabs>

      {/* New Trade Modal */}
      <Dialog open={showNewTradeModal} onOpenChange={setShowNewTradeModal}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 text-gray-100 border-2 border-gray-700 rounded-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-800">
            <DialogTitle className="text-2xl font-bold text-white">
              บันทึกการเทรดใหม่
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              บันทึกรายละเอียดการเทรดของคุณเพื่อติดตามผลงาน
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <TradeFormNew onTradeCreated={handleTradeCreated} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Trade Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 text-gray-100 border-2 border-gray-700 rounded-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-800">
            <DialogTitle className="text-2xl font-bold text-white">
              แก้ไขการเทรด
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              แก้ไขรายละเอียดการเทรดของคุณ
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            {editingTradeId && (
              <TradeFormNew
                tradeId={editingTradeId}
                onTradeUpdated={handleTradeUpdated}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trading Calculator Modal */}
      <TradingCalculator
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
    </div>
  )
}