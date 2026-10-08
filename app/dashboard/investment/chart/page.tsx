"use client"
import TradingViewWidget from "@/components/crypto/TradingViewWidget"
import { PageHeader } from "@/components/ui/page-header"

export default function InvestmentChartPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow="Investment"
        title="Interactive Chart"
        description="Real-time multi-asset technical charts and watchlist analysis."
      />
      <div className="h-[700px] w-full rounded-xl overflow-hidden border border-white/5 bg-card">
        <TradingViewWidget />
      </div>
    </div>
  )
}

