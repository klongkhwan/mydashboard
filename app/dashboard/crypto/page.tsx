"use client"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Newspaper, DollarSign, Search, BarChart3 } from "lucide-react"
import { Calendar } from "@/components/crypto/calendartab"
import NewsFlowPanel from "@/components/crypto/NewsTab"
import BinanceThCampaigns from "@/components/crypto/HomeTab"
import { TradingTab } from "@/components/crypto/TradingTab"
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Crypto Dashboard</h1>
        <p className="text-muted-foreground mt-2">ติดตามข่าวสาร ราคา และวิเคราะห์ตลาด Cryptocurrency</p>
      </div>

      <Tabs defaultValue="BinanceThCampaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="BinanceThCampaigns" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="w-4 h-4" />
            Home
          </TabsTrigger>
          <TabsTrigger value="Calendar" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Newspaper className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="NewsFlowPanel" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="w-4 h-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="trading" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="w-4 h-4" />
            Trading Trend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="Calendar" className="mt-6">
          <Calendar />
        </TabsContent>

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
      </Tabs>
    </div>
  )
}
