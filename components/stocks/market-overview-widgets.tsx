"use client"

import { TradingViewElement } from "@/components/stocks/tradingview-element"

const script = "https://widgets.tradingview-widget.com/w/th_TH/tv-market-data.js"
const attributes = {
  theme: "dark",
  "symbol-sectors": JSON.stringify([
    {
      sectionName: "Nasdaq",
      symbols: ["NASDAQ:TSLA", "NASDAQ:META", "NASDAQ:AMZN", "NASDAQ:NVDA", "NASDAQ:GOOG", "NASDAQ:SPCX", "NASDAQ:RKLB", "NASDAQ:MSFT", "NASDAQ:AMD", "NYSE:ORCL", "NASDAQ:AAPL", "NASDAQ:NFLX", "NASDAQ:EOSE", "NASDAQ:MU", "NASDAQ:SNDK"],
    },
    {
      sectionName: "Crypto",
      symbols: ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:BNBUSDT", "BINANCE:ASTERUSDT", "BINANCE:SUIUSDT", "BINANCE:ADAUSDT", "BINANCE:DOGEUSDT", "BINANCE:AVAXUSDT", "BINANCE:SOLUSDT"],
    },
    {
      sectionName: "Futures",
      symbols: ["BMFBOVESPA:ISP1!", "BMFBOVESPA:EUR1!", "CMCMARKETS:GOLD", "TVC:USOIL", "BMFBOVESPA:CCM1!", "FX_IDC:USDTHB"],
    },
    {
      sectionName: "Bonds",
      symbols: ["EUREX:FGBL1!", "EUREX:FBTP1!", "EUREX:FGBM1!"],
    },
  ]),
}

export function MarketOverviewWidgets() {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f] p-2 sm:p-4">
      <TradingViewElement script={script}  tag="tv-market-data" attributes={attributes} />
    </section>
  )
}
