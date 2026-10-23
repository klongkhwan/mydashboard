"use client"

import { Search, Settings2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const storageKey = "stocks-ticker-symbols"
const defaults = ["FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD", "FOREXCOM:DJI", "FX:EURUSD", "BITSTAMP:BTCUSD", "BITSTAMP:ETHUSD", "CMCMARKETS:GOLD"]

export function StocksTickerBar({ className }: { className?: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [symbols, setSymbols] = useState(defaults)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every((symbol) => typeof symbol === "string")) setSymbols(parsed)
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [])

  useEffect(() => {
    const scriptId = "tv-ticker-tape-script"
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script")
      script.id = scriptId
      script.type = "module"
      script.src = "https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"
      document.head.appendChild(script)
    }
    const ticker = document.createElement("tv-ticker-tape")
    ticker.setAttribute("symbols", symbols.join(","))
    container.current?.replaceChildren(ticker)
  }, [symbols])

  const saveSymbols = (next: string[]) => {
    const cleaned = next.map((symbol) => symbol.trim()).filter(Boolean)
    setSymbols(cleaned)
    localStorage.setItem(storageKey, JSON.stringify(cleaned))
  }
  const addSymbol = () => saveSymbols([...symbols, query])

  return (
    <div className={cn("rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-2", className)}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-hidden" ref={container} />
        <div className="relative flex shrink-0 items-center gap-1">
          <Search className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" />
          <input aria-label="Search symbol" className="h-8 w-36 rounded-md bg-surface-hover pl-8 pr-2 text-xs text-white outline-none focus:ring-1 focus:ring-primary" onChange={(event) => setQuery(event.target.value.toUpperCase())} placeholder="Search symbol" value={query} />
          <button aria-label="Add symbol" className="h-8 rounded-md bg-primary px-2 text-xs font-bold text-black disabled:opacity-40" disabled={!query.trim()} onClick={addSymbol}>Add</button>
          <button aria-label="Edit ticker symbols" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-white" onClick={() => setEditing(!editing)}><Settings2 className="h-4 w-4" /></button>
        </div>
      </div>
      {editing && <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">{symbols.map((symbol, index) => <label className="flex items-center rounded-md bg-surface-hover" key={`${symbol}-${index}`}><input className="w-32 bg-transparent px-2 py-1 text-xs text-white outline-none" onChange={(event) => saveSymbols(symbols.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} value={symbol} /><button aria-label={`Remove ${symbol}`} className="p-1 text-muted-foreground hover:text-white" onClick={() => saveSymbols(symbols.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3 w-3" /></button></label>)}</div>}
    </div>
  )
}
