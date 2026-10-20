"use client"

import { cn } from "@/lib/utils"
import { useWealth } from "./wealth-context"

export function WealthApiStatus({ showRate = false, className }: { showRate?: boolean; className?: string }) {
  const { lastUpdated, quotesLoading, usdThbRate } = useWealth()

  return (
    <div className={cn("flex items-center gap-2 text-xs text-spotify-muted tabular-nums", className)}>
      {showRate && (
        <>
          <span className="hidden sm:inline">1 USD ≈ ฿{usdThbRate.toFixed(2)}</span>
          <span className="hidden sm:inline text-white/20">•</span>
        </>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", quotesLoading ? "bg-amber-400 animate-ping" : "bg-primary")} />
        <span>{quotesLoading ? "กำลังเชื่อมต่อ API..." : (lastUpdated ? `อัปเดตล่าสุด ${lastUpdated} น.` : "API พร้อมใช้งาน")}</span>
      </span>
    </div>
  )
}
