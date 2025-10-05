"use client"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Newspaper, DollarSign, Search, BarChart3 } from "lucide-react"
import { NewsTab } from "@/components/crypto/NewsTab"
import { PriceTab } from "@/components/crypto/PriceTab"
import { ScannerTab } from "@/components/crypto/ScannerTab"
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

      <Tabs defaultValue="news" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="news" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Newspaper className="w-4 h-4" />
            News
          </TabsTrigger>
          <TabsTrigger value="price" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="w-4 h-4" />
            Price
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="w-4 h-4" />
            Scanner
          </TabsTrigger>
          <TabsTrigger value="trading" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="w-4 h-4" />
            Trading Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-6">
          <NewsTab />
        </TabsContent>

        <TabsContent value="price" className="mt-6">
          <PriceTab
            selectedCoins={selectedCoins}
            setSelectedCoins={setSelectedCoins}
          />
        </TabsContent>

        <TabsContent value="scanner" className="mt-6">
          <ScannerTab
            filters={scannerFilters}
            setFilters={setScannerFilters}
          />
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
