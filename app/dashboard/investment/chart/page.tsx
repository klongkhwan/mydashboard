"use client"

import { useState } from "react"
import TradingViewWidget from "@/components/crypto/TradingViewWidget"
import { InteractiveTradingChart } from "@/components/charts/InteractiveTradingChart"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Activity, Layers } from "lucide-react"

export default function InvestmentChartPage() {
  const [chartMode, setChartMode] = useState<"lightweight" | "tradingview">("lightweight")

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Investment"
          title="Interactive Chart"
          description="Real-time multi-asset technical charts, live WebSocket feeds, and unlimited indicators."
        />
        <div className="flex items-center gap-1.5 bg-[#181818] p-1 rounded-xl border border-white/10 w-fit self-start sm:self-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setChartMode("lightweight")}
            className={`text-xs px-3 py-1.5 h-8 rounded-lg transition-all ${
              chartMode === "lightweight"
                ? "bg-primary text-black font-bold shadow"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Lightweight Pro (Live)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setChartMode("tradingview")}
            className={`text-xs px-3 py-1.5 h-8 rounded-lg transition-all ${
              chartMode === "tradingview"
                ? "bg-primary text-black font-bold shadow"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            TradingView Embed
          </Button>
        </div>
      </div>

      {chartMode === "lightweight" ? (
        <InteractiveTradingChart height={680} />
      ) : (
        <div className="h-[700px] w-full rounded-xl overflow-hidden border border-white/5 bg-card">
          <TradingViewWidget />
        </div>
      )}
    </div>
  )
}
