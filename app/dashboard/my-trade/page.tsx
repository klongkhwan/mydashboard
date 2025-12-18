"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TradeModal } from "@/components/trading/trade-modal"
import { TradeList } from "@/components/trading/trade-list"
import { TradeStats } from "@/components/trading/trade-stats"
import { TradingCalculator } from "@/components/trading/trading-calculator"
import { DualInvestmentTab } from "@/components/dual-investment/DualInvestmentTab"
import { PlusCircle, TrendingUp, ListTodo, BarChart3, Calculator, Target } from "lucide-react"

export default function MyTradePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [showNewTradeModal, setShowNewTradeModal] = useState(false)
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCalculatorModal, setShowCalculatorModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleTradeCreated = () => {
    refreshData()
    setShowNewTradeModal(false)
    // Switch to trades tab to see the new trade
    setActiveTab("trades")
  }

  const handleTradeUpdated = () => {
    refreshData()
    setShowEditModal(false)
    setEditingTradeId(null)
    // Switch to trades tab to see the updated trade
    setActiveTab("trades")
  }

  const handleTradeDeleted = () => {
    refreshData()
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
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCalculatorModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculate
            </Button>
            <Button
              onClick={() => setShowNewTradeModal(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              บันทึกการเทรด
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
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
          <TabsTrigger
            value="dual-investment"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Target className="w-4 h-4" />
            Dual Investment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">


          <TradeStats refreshTrigger={refreshKey} />
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <TradeList
            refreshTrigger={refreshKey}
            onTradeUpdated={handleTradeUpdated}
            onTradeDeleted={handleTradeDeleted}
            onRefresh={refreshData}
            onEditTrade={handleEditTrade}
          />
        </TabsContent>

        <TabsContent value="dual-investment" className="space-y-6">
          <DualInvestmentTab />
        </TabsContent>

      </Tabs>

      {/* Shared Trade Modal */}
      <TradeModal
        isOpen={showNewTradeModal || showEditModal}
        onClose={() => {
          setShowNewTradeModal(false)
          setShowEditModal(false)
          setEditingTradeId(null)
        }}
        tradeId={editingTradeId}
        onSuccess={editingTradeId ? handleTradeUpdated : handleTradeCreated}
      />

      {/* Trading Calculator Modal */}
      <TradingCalculator
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
    </div>
  )
}