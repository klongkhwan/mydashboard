"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import TradingViewWidget from "@/components/crypto/TradingViewWidget"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Activity, Layers, Loader2 } from "lucide-react"

const InteractiveTradingChart = dynamic(
  () => import("@/components/charts/InteractiveTradingChart").then((m) => m.InteractiveTradingChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[680px] w-full rounded-xl bg-[#131722] border border-[#2a2e39] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2962ff]" />
        <span className="text-xs font-mono text-zinc-400">Loading Lightweight Pro Engine...</span>
      </div>
    ),
  }
)

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
        <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-white/10 w-fit self-start sm:self-auto">
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
