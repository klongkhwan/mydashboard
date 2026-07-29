import { TradingViewScriptWidget } from "@/components/stocks/tradingview-script-widget"

export default function ScreenerPage() {
  return <div className="p-8"><div className="mb-8"><h1 className="text-spotify-title">Screener</h1><p className="mt-2 text-spotify-muted">Find US stocks by performance and technical screening criteria.</p></div><section className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f] p-4"><TradingViewScriptWidget className="min-h-[550px]" script="https://s3.tradingview.com/external-embedding/embed-widget-screener.js" config={{ market: "america", showToolbar: true, defaultColumn: "performance", defaultScreen: "below_52wk_low", isTransparent: false, locale: "th_TH", colorTheme: "dark", width: "100%", height: 550 }} /></section></div>
}
