"use client"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Newspaper, DollarSign, Search, BarChart3, TrendingUp } from "lucide-react"
import NewsFlowPanel from "@/components/crypto/NewsTab"
import BinanceThCampaigns from "@/components/crypto/HomeTab"
import { TradingTab } from "@/components/crypto/TradingTab"
import { DualInvestmentTab } from "@/components/dual-investment/DualInvestmentTab"
import { ScannerFilters } from "@/types/crypto"

export default function CryptoPage() {
  const [selectedCoins, setSelectedCoins] = useState(["BTC", "ETH", "BNB"])
  const [scannerFilters, setScannerFilters] = useState<ScannerFilters>({
    minPrice: "",
    maxPrice: "",
    minVolume: "",
    category: "all",
  })

  const [tradingSymbol, setTradingSymbol] = useState("DOGEUSDC")
  const [tradingPeriod, setTradingPeriod] = useState("60")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-spotify-title">Crypto Dashboard</h1>
        <p className="text-spotify-muted mt-2">ติดตามข่าวสาร ราคา และวิเคราะห์ตลาด Cryptocurrency</p>
      </div>

      <Tabs defaultValue="BinanceThCampaigns" className="w-full">
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
          <NewsFlowPanel />
        </TabsContent>

        <TabsContent value="BinanceThCampaigns" className="mt-6">
          <BinanceThCampaigns />
        </TabsContent>


        <TabsContent value="trading" className="mt-6">
          <TradingTab
            symbol={tradingSymbol}
            period={tradingPeriod}
            onSymbolChange={setTradingSymbol}
            onPeriodChange={setTradingPeriod}
          />
        </TabsContent>

        <TabsContent value="dual-investment" className="mt-6">
          <DualInvestmentTab />
        </TabsContent>


        </Tabs>
    </div>
  )
}
