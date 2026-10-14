"use client"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/ui/page-header"
import dynamic from "next/dynamic"
import { ModernPageLoading } from "@/components/ui/modern-loader"

const NewsFlowPanel = dynamic(() => import("@/components/crypto/NewsTab"), {
  loading: () => <ModernPageLoading text="Loading news..." />,
  ssr: false,
})
const BinanceThCampaigns = dynamic(() => import("@/components/crypto/HomeTab"), {
  loading: () => <ModernPageLoading text="Loading campaigns..." />,
  ssr: false,
})
const TradingTab = dynamic(() => import("@/components/crypto/TradingTab").then(mod => mod.TradingTab), {
  loading: () => <ModernPageLoading text="Loading trading dashboard..." />,
  ssr: false,
})
const DualInvestmentTab = dynamic(() => import("@/components/dual-investment/DualInvestmentTab").then(mod => mod.DualInvestmentTab), {
  loading: () => <ModernPageLoading text="Loading dual investment..." />,
  ssr: false,
})

export default function CryptoPage() {
  const [activeTab, setActiveTab] = useState("BinanceThCampaigns")
  const [tradingSymbol, setTradingSymbol] = useState("DOGEUSDC")
  const [tradingPeriod, setTradingPeriod] = useState("60")

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Investment · Crypto"
        title="Crypto Dashboard"
        description="ติดตามข่าวสาร ราคา และวิเคราะห์แนวโน้มตลาด Cryptocurrency"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 pt-2 pb-4">
          <TabsList className="flex w-fit bg-transparent p-0 gap-2 border-none">
            <TabsTrigger value="BinanceThCampaigns" className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-4 py-1.5 h-auto transition-all duration-300">
              Home
            </TabsTrigger>
            <TabsTrigger value="NewsFlowPanel" className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-4 py-1.5 h-auto transition-all duration-300">
              News
            </TabsTrigger>
            <TabsTrigger value="trading" className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-4 py-1.5 h-auto transition-all duration-300">
              Trading Trend
            </TabsTrigger>
            <TabsTrigger value="dual-investment" className="btn-pill data-[state=active]:bg-primary data-[state=active]:text-black border-none px-6 py-2 h-auto transition-all duration-300">
              Dual Investment
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="NewsFlowPanel" className="mt-6">
          {activeTab === "NewsFlowPanel" && <NewsFlowPanel />}
        </TabsContent>

        <TabsContent value="BinanceThCampaigns" className="mt-6">
          {activeTab === "BinanceThCampaigns" && <BinanceThCampaigns />}
        </TabsContent>

        <TabsContent value="trading" className="mt-6">
          {activeTab === "trading" && (
            <TradingTab
              symbol={tradingSymbol}
              period={tradingPeriod}
              onSymbolChange={setTradingSymbol}
              onPeriodChange={setTradingPeriod}
            />
          )}
        </TabsContent>

        <TabsContent value="dual-investment" className="mt-6">
          {activeTab === "dual-investment" && <DualInvestmentTab />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
