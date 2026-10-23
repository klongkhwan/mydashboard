"use client"

import { useEffect, useRef } from "react"
import { heatmapWidgets } from "@/lib/stock-heatmap-widget-config.js"

type HeatmapKind = "stock" | "crypto"

interface TradingViewHeatmapProps {
  kind: HeatmapKind
}

export function TradingViewHeatmap({ kind }: TradingViewHeatmapProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const widget = heatmapWidgets[kind]
    const element = container.current

    if (!element) return

    element.replaceChildren()

    const script = document.createElement("script")
    script.src = widget.script
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      ...widget.config,
      locale: "en",
      symbolUrl: "",
      colorTheme: "dark",
      exchanges: [],
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "100%",
    })
    element.appendChild(script)

    return () => {
      element.replaceChildren()
    }
  }, [kind])

  const widget = heatmapWidgets[kind]

  return (
    <div className="h-[680px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]">
      <div className="h-[calc(100%-28px)] w-full" ref={container} />
      <div className="flex h-7 items-center px-3 text-[10px] text-muted-foreground">
        <a className="hover:text-primary" href={widget.sourceUrl} rel="noopener nofollow" target="_blank">
          {widget.label} by TradingView
        </a>
      </div>
    </div>
  )
}
