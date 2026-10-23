"use client"

import { FileBarChart, Gauge, Heart, Info, Star } from "lucide-react"
import { useEffect, useState } from "react"

import { PageHeader, SectionLabel, SectionPanel } from "@/components/stocks/section-panel"
import { SymbolSearch } from "@/components/stocks/symbol-search"
import { TradingViewScriptWidget } from "@/components/stocks/tradingview-script-widget"

const favoriteKey = "stocks-explorer-favorites"

// Seeded on first visit so the watchlist is useful before the user has pinned anything.
const defaultFavorites = [
  "NASDAQ:TSLA", "NASDAQ:META", "NASDAQ:AMZN", "NASDAQ:NVDA", "NASDAQ:GOOG", "NASDAQ:SPCX",
  "NASDAQ:RKLB", "NASDAQ:MSFT", "NASDAQ:AMD", "NYSE:ORCL", "NASDAQ:AAPL", "NASDAQ:NFLX",
  "NASDAQ:EOSE", "NASDAQ:MU", "NASDAQ:SNDK", "NASDAQ:AVGO", "NASDAQ:CRWD", "NASDAQ:PLTR",
]

export default function MarketExplorerPage() {
  const [symbol, setSymbol] = useState("NASDAQ:AAPL")
  const [query, setQuery] = useState(symbol)
  const [favorites, setFavorites] = useState<string[]>([])
  useEffect(() => {
    try {
      const stored = localStorage.getItem(favoriteKey)
      // Only seed when the key is absent — an emptied watchlist stays empty.
      if (stored === null) { setFavorites(defaultFavorites); localStorage.setItem(favoriteKey, JSON.stringify(defaultFavorites)); return }
      const saved = JSON.parse(stored)
      if (Array.isArray(saved)) setFavorites(saved)
    } catch { localStorage.removeItem(favoriteKey) }
  }, [])
  const saveFavorites = (next: string[]) => { setFavorites(next); localStorage.setItem(favoriteKey, JSON.stringify(next)) }
  const isFavorite = favorites.includes(symbol)
  const selectSymbol = (next: string) => { if (next.trim()) setSymbol(next.trim().toUpperCase()) }
  const widgetTheme = { colorTheme: "dark", isTransparent: false, locale: "en", symbol }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8">
      <PageHeader
        eyebrow="Investment"
        title="Market Explorer"
        description="Search and compare stocks from Thailand and global markets."
      />

      <div className="space-y-8">
        <section className="space-y-3">
          <SectionLabel hint={symbol}>Symbol detail</SectionLabel>
          <div className="grid gap-6 xl:grid-cols-3">
            {/* overflow-visible so the search dropdown can escape the panel, which clips by default. */}
            <SectionPanel className="overflow-visible xl:col-span-2" title="Symbol Info" description="Search, watchlist, and key quote data." icon={Info}>
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-full max-w-sm">
                    <SymbolSearch onChange={setQuery} onSelect={selectSymbol} value={query} />
                  </div>
                  <button
                    aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-hover text-white transition-colors hover:bg-[#3a3a3a]"
                    onClick={() => saveFavorites(isFavorite ? favorites.filter((item) => item !== symbol) : [...favorites, symbol])}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>

                {/* Takes the slack in the panel so it stays level with Technical Analysis beside it,
                    and scrolls once the list outgrows that space instead of stretching the row. */}
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Watchlist</span>
                    <span className="h-px flex-1 bg-white/5" />
                    {favorites.length > 0 && <span className="text-[10px] text-muted-foreground">{favorites.length} pinned</span>}
                  </div>
                  {favorites.length > 0 ? (
                    <div className="flex max-h-[132px] flex-wrap content-start gap-2 overflow-y-auto pr-1">
                      {favorites.map((item) => (
                        <button
                          className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors ${item === symbol ? "bg-primary text-black" : "bg-surface-hover text-white hover:bg-[#3a3a3a]"}`}
                          key={item}
                          onClick={() => { setSymbol(item); setQuery(item) }}
                        >
                          <Star className={`h-3 w-3 ${item === symbol ? "fill-black" : "fill-primary text-primary"}`} />
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-white/10 px-4 py-3 text-xs text-muted-foreground">
                      No saved symbols yet — search a symbol and tap the heart to pin it here.
                    </p>
                  )}
                </div>

                <TradingViewScriptWidget className="min-h-[188px] shrink-0" script="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js" config={{ ...widgetTheme, width: "100%" }} />
              </div>
            </SectionPanel>
            <SectionPanel title="Technical Analysis" description="Oscillator and moving-average signals." icon={Gauge}>
              {/* The official embed is used instead of the tv-technical-analysis custom element,
                  which has no theme attribute and always renders on a white background.
                  Title + interval tabs + gauge + counts need ~345px; below that the iframe scrolls.
                  The widget is transparent, so surplus height is invisible — the panel background
                  shows through — which makes over-allocating the safe direction. */}
              <TradingViewScriptWidget className="min-h-[400px]" script="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js" config={{ ...widgetTheme, isTransparent: true, width: "100%", height: 400, interval: "1D", showIntervalTabs: true, displayMode: "single" }} />
            </SectionPanel>
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel hint="Income statement, balance sheet, cash flow">Fundamentals</SectionLabel>
          <SectionPanel title="Fundamental Data" description="Reported financials by period." icon={FileBarChart}>
            <TradingViewScriptWidget className="min-h-[550px]" script="https://s3.tradingview.com/external-embedding/embed-widget-financials.js" config={{ ...widgetTheme, locale: "th_TH", displayMode: "regular", width: "100%", height: 550 }} />
          </SectionPanel>
        </section>
      </div>
    </div>
  )
}
