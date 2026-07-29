"use client"
import TradingViewWidget from "@/components/crypto/TradingViewWidget"
export default function InvestmentChartPage() { return <div className="p-8"><h1 className="text-spotify-title">Chart</h1><p className="mb-8 mt-2 text-spotify-muted">Interactive charts and a saved watchlist.</p><div className="h-[700px] w-full"><TradingViewWidget /></div></div> }
