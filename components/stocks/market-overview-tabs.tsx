"use client"

import { MarketOverviewWidgets } from "@/components/stocks/market-overview-widgets"
import { TradingViewHeatmap } from "@/components/stocks/trading-view-heatmap"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const pillClass =
  "btn-pill h-auto border-none px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-black"

export type MarketOverviewTab = "overview" | "heatmap"

interface MarketOverviewTabsProps {
  defaultTab?: MarketOverviewTab
}

export function MarketOverviewTabs({ defaultTab = "overview" }: MarketOverviewTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-6 w-fit gap-2 border-none bg-transparent p-0">
        <TabsTrigger value="overview" className={pillClass}>
          Overview
        </TabsTrigger>
        <TabsTrigger value="heatmap" className={pillClass}>
          Heatmap
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <MarketOverviewWidgets />
      </TabsContent>

      <TabsContent value="heatmap" className="mt-0">
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="mb-4 w-fit gap-2 border-none bg-transparent p-0">
            <TabsTrigger value="stock" className={pillClass}>
              Stock
            </TabsTrigger>
            <TabsTrigger value="crypto" className={pillClass}>
              Crypto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-0">
            <TradingViewHeatmap kind="stock" />
          </TabsContent>
          <TabsContent value="crypto" className="mt-0">
            <TradingViewHeatmap kind="crypto" />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  )
}
