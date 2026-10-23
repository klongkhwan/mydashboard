"use client"

import { redirect } from "next/navigation"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/ui/page-header"
import { TradeModal } from "@/components/trading/trade-modal"
import { TradeList } from "@/components/trading/trade-list"
import { TradeStats } from "@/components/trading/trade-stats"
import { TradingCalculator } from "@/components/trading/trading-calculator"
import { PlusCircle, TrendingUp, ListTodo, BarChart3, Calculator } from "lucide-react"

function LegacyMyTradePage() {
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
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Trading Journal"
        title="My Trade"
        description="บันทึก ติดตาม และวิเคราะห์ผลการเทรดของคุณ"
        action={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCalculatorModal(true)}
              variant="pill-secondary"
              className="bg-secondary hover:bg-surface-hover text-white"
            >
              <Calculator className="w-4 h-4 mr-2 text-primary" />
              Calculate
            </Button>
            <Button
              onClick={() => setShowNewTradeModal(true)}
              variant="pill" className=""
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              บันทึกการเทรด
            </Button>
          </div>
        }
      />


      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 pt-2 pb-4">
          <TabsList className="flex w-fit bg-transparent p-0 gap-2 border-none">
            <TabsTrigger
              value="overview"
              className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-6 py-2 h-auto transition-all duration-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              ภาพรวม
            </TabsTrigger>
            <TabsTrigger
              value="trades"
              className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-6 py-2 h-auto transition-all duration-300"
            >
              <ListTodo className="w-4 h-4 mr-2" />
              รายการทั้งหมด
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <TradeStats refreshTrigger={refreshKey} />
        </TabsContent>

        <TabsContent value="trades" className="mt-0">
          <TradeList
            refreshTrigger={refreshKey}
            onTradeUpdated={handleTradeUpdated}
            onTradeDeleted={handleTradeDeleted}
            onRefresh={refreshData}
            onEditTrade={handleEditTrade}
          />
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
export default function MyTradePage() {
  redirect("/dashboard/my-wealth")
}
