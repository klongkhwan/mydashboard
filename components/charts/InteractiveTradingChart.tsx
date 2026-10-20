"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts"
import {
  CandleData,
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
} from "@/lib/indicators"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, Eye, EyeOff } from "lucide-react"
import { getChartSettings, saveChartSettings } from "@/app/dashboard/investment/chart/actions"

export interface TradeOverlayInfo {
  symbol: string
  direction: "buy" | "sell"
  entry_price: number
  exit_price?: number
  entry_date?: string
}

export interface InteractiveTradingChartProps {
  initialSymbol?: string
  initialInterval?: string
  trade?: TradeOverlayInfo | null
  height?: number
  className?: string
  showControls?: boolean
}

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
]

export function InteractiveTradingChart({
  initialSymbol = "BTCUSDT",
  initialInterval = "15m",
  trade = null,
  height = 550,
  className = "",
  showControls = true,
}: InteractiveTradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map())
  const rawCandlesRef = useRef<CandleData[]>([])

  const [symbol, setSymbol] = useState(trade?.symbol?.toUpperCase() || initialSymbol)
  const [interval, setInterval] = useState(initialInterval)
  const [isConnected, setIsConnected] = useState(false)
  const [lastPrice, setLastPrice] = useState<{ open: number; high: number; low: number; close: number } | null>(null)

  // Active indicators state
  const [indicators, setIndicators] = useState({
    ema9: true,
    ema21: true,
    ema50: false,
    ema200: false,
    bb: false,
    rsi: false,
  })

  // Format symbol to Binance standard (e.g. BTC -> BTCUSDT)
  const cleanSymbol = useMemo(() => {
    let s = (symbol || "BTCUSDT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!s.endsWith("USDT") && !s.endsWith("BUSD") && !s.endsWith("USDC")) {
      s += "USDT"
    }
    return s
  }, [symbol])

  // Sync symbol when trade prop changes
  useEffect(() => {
    if (trade?.symbol) {
      setSymbol(trade.symbol)
    }
  }, [trade?.symbol])

  // Load preferences from Supabase / localStorage
  const isLoaded = useRef(false)
  useEffect(() => {
    let active = true
    async function loadPreferences() {
      try {
        const local = localStorage.getItem("superlboard_chart_settings")
        if (local) {
          const parsed = JSON.parse(local)
          if (parsed.symbol && !trade?.symbol) setSymbol(parsed.symbol)
          if (parsed.interval) setInterval(parsed.interval)
          if (parsed.indicators) setIndicators((prev) => ({ ...prev, ...parsed.indicators }))
        }
      } catch {}

      try {
        const remote = await getChartSettings()
        if (active && remote) {
          if (remote.symbol && !trade?.symbol) setSymbol(remote.symbol)
          if (remote.interval) setInterval(remote.interval)
          if (remote.indicators) setIndicators((prev) => ({ ...prev, ...remote.indicators }))
          try {
            localStorage.setItem("superlboard_chart_settings", JSON.stringify(remote))
          } catch {}
        }
      } catch {} finally {
        if (active) isLoaded.current = true
      }
    }
    loadPreferences()
    return () => { active = false }
  }, [trade?.symbol])

  // Save preferences to Supabase & localStorage (debounced)
  useEffect(() => {
    if (!isLoaded.current) return
    const payload = { symbol, interval, indicators }
    try {
      localStorage.setItem("superlboard_chart_settings", JSON.stringify(payload))
    } catch {}

    const timer = setTimeout(() => {
      saveChartSettings(payload)
    }, 1200)

    return () => clearTimeout(timer)
  }, [symbol, interval, indicators])

  // Initialize and update chart
  useEffect(() => {
    if (!containerRef.current) return

    // 1. Create Chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0f0f0f" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        vertLine: { color: "rgba(255, 255, 255, 0.2)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(255, 255, 255, 0.2)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      height,
    })

    chartRef.current = chart

    // 2. Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })
    candleSeriesRef.current = candleSeries

    // 3. Add Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay mode
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })
    volumeSeriesRef.current = volumeSeries

    // 4. Track Crosshair for Legend display
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.get(candleSeries)) {
        const data = param.seriesData.get(candleSeries) as {
          open: number
          high: number
          low: number
          close: number
        }
        if (data) setLastPrice(data)
      }
    })

    // Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !entries[0].contentRect) return
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    resizeObserver.observe(containerRef.current)

    // 5. Fetch historical candles & connect WebSocket
    let ws: WebSocket | null = null
    let isCancelled = false

    async function loadData() {
      try {
        // shortcut: using Binance public klines API directly; upgrade to custom proxy if rate limited
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=250`
        )
        if (!res.ok) throw new Error(`Binance error: ${res.statusText}`)
        const raw = await res.json()
        if (isCancelled) return

        const candles: CandleData[] = raw.map((d: (string | number)[]) => ({
          time: Math.floor(Number(d[0]) / 1000),
          open: Number(d[1]),
          high: Number(d[2]),
          low: Number(d[3]),
          close: Number(d[4]),
          volume: Number(d[5]),
        }))

        rawCandlesRef.current = candles

        // Set candles data
        candleSeries.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        )

        // Set volume data
        volumeSeries.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume || 0,
            color: c.close >= c.open ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
          }))
        )

        if (candles.length > 0) {
          const last = candles[candles.length - 1]
          setLastPrice({ open: last.open, high: last.high, low: last.low, close: last.close })
        }

        // Apply Trade Markers & Price Lines if provided
        if (trade && trade.entry_price > 0) {
          candleSeries.createPriceLine({
            price: trade.entry_price,
            color: "#3b82f6",
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Entry (${trade.direction.toUpperCase()})`,
          })

          if (trade.exit_price && trade.exit_price > 0) {
            const isProfit =
              trade.direction === "buy"
                ? trade.exit_price >= trade.entry_price
                : trade.exit_price <= trade.entry_price

            candleSeries.createPriceLine({
              price: trade.exit_price,
              color: isProfit ? "#10b981" : "#ef4444",
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `Exit (${isProfit ? "+" : "-"})`,
            })
          }

          // Trade Marker on entry date
          if (trade.entry_date) {
            const entryTs = Math.floor(new Date(trade.entry_date).getTime() / 1000)
            const nearestCandle = candles.reduce((prev, curr) =>
              Math.abs(curr.time - entryTs) < Math.abs(prev.time - entryTs) ? curr : prev
            )

            if (nearestCandle) {
              const marker: SeriesMarker<UTCTimestamp> = {
                time: nearestCandle.time as UTCTimestamp,
                position: trade.direction === "buy" ? "belowBar" : "aboveBar",
                color: trade.direction === "buy" ? "#10b981" : "#ef4444",
                shape: trade.direction === "buy" ? "arrowUp" : "arrowDown",
                text: `${trade.direction.toUpperCase()} @ ${trade.entry_price}`,
              }
              createSeriesMarkers(candleSeries, [marker])
            }
          }
        }

        // Connect real-time WebSocket
        ws = new WebSocket(
          `wss://stream.binance.com:9443/ws/${cleanSymbol.toLowerCase()}@kline_${interval}`
        )

        ws.onopen = () => {
          if (!isCancelled) setIsConnected(true)
        }

        ws.onmessage = (event) => {
          if (isCancelled) return
          try {
            const msg = JSON.parse(event.data)
            if (msg.k) {
              const k = msg.k
              const candleUpdate: CandleData = {
                time: Math.floor(Number(k.t) / 1000),
                open: Number(k.o),
                high: Number(k.h),
                low: Number(k.l),
                close: Number(k.c),
                volume: Number(k.v),
              }

              candleSeries.update({
                time: candleUpdate.time as UTCTimestamp,
                open: candleUpdate.open,
                high: candleUpdate.high,
                low: candleUpdate.low,
                close: candleUpdate.close,
              })

              volumeSeries.update({
                time: candleUpdate.time as UTCTimestamp,
                value: candleUpdate.volume || 0,
                color:
                  candleUpdate.close >= candleUpdate.open
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(239, 68, 68, 0.3)",
              })

              setLastPrice({
                open: candleUpdate.open,
                high: candleUpdate.high,
                low: candleUpdate.low,
                close: candleUpdate.close,
              })
            }
          } catch (e) {
            console.error("WS Parse error", e)
          }
        }

        ws.onerror = () => {
          if (!isCancelled) setIsConnected(false)
        }
        ws.onclose = () => {
          if (!isCancelled) setIsConnected(false)
        }
      } catch (err) {
        console.error("Failed to load chart data:", err)
      }
    }

    loadData()

    return () => {
      isCancelled = true
      if (ws) ws.close()
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      indicatorSeriesRef.current.clear()
    }
  }, [cleanSymbol, interval, height, trade])

  // Update indicators whenever toggled or candles reload
  useEffect(() => {
    const chart = chartRef.current
    const candles = rawCandlesRef.current
    if (!chart || candles.length === 0) return

    const activeMap = indicatorSeriesRef.current

    // Helper to sync or create line series
    const syncLine = (
      id: string,
      enabled: boolean,
      color: string,
      lineWidth: 1 | 2 | 3 | 4,
      data: { time: number; value: number }[]
    ) => {
      if (enabled) {
        let series = activeMap.get(id)
        if (!series) {
          series = chart.addSeries(LineSeries, {
            color,
            lineWidth,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
          })
          activeMap.set(id, series)
        }
        series.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
      } else {
        const series = activeMap.get(id)
        if (series) {
          chart.removeSeries(series)
          activeMap.delete(id)
        }
      }
    }

    syncLine("ema9", indicators.ema9, "#3b82f6", 1, calculateEMA(candles, 9))
    syncLine("ema21", indicators.ema21, "#f59e0b", 1, calculateEMA(candles, 21))
    syncLine("ema50", indicators.ema50, "#ec4899", 2, calculateEMA(candles, 50))
    syncLine("ema200", indicators.ema200, "#8b5cf6", 2, calculateEMA(candles, 200))

    const bb = calculateBollingerBands(candles, 20, 2)
    syncLine("bbUpper", indicators.bb, "rgba(59, 130, 246, 0.6)", 1, bb.upper)
    syncLine("bbMiddle", indicators.bb, "rgba(156, 163, 175, 0.5)", 1, bb.middle)
    syncLine("bbLower", indicators.bb, "rgba(59, 130, 246, 0.6)", 1, bb.lower)
  }, [indicators, cleanSymbol, interval])

  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={`relative flex flex-col rounded-xl border border-white/10 bg-[#0f0f0f] overflow-hidden ${className}`}>
      {/* Top Toolbar */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-[#141414] px-4 py-2.5 text-xs text-muted-foreground">
          {/* Symbol & Price Info */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-sm tracking-wide">{cleanSymbol}</span>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border-0 ${
                isConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {isConnected ? <Wifi className="h-3 w-3 animate-pulse" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "LIVE" : "DISCONNECTED"}
            </Badge>

            {lastPrice && (
              <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                <span>O: <span className="text-zinc-200">{lastPrice.open.toFixed(2)}</span></span>
                <span>H: <span className="text-emerald-400">{lastPrice.high.toFixed(2)}</span></span>
                <span>L: <span className="text-rose-400">{lastPrice.low.toFixed(2)}</span></span>
                <span>C: <span className={lastPrice.close >= lastPrice.open ? "text-emerald-400" : "text-rose-400"}>{lastPrice.close.toFixed(2)}</span></span>
              </div>
            )}
          </div>

          {/* Timeframe & Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe buttons */}
            <div className="flex items-center rounded-lg bg-[#222] p-0.5 border border-white/5">
              {INTERVALS.map((intv) => (
                <button
                  key={intv.value}
                  onClick={() => setInterval(intv.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    interval === intv.value
                      ? "bg-primary text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>

            {/* Indicator Toggles */}
            <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-white/10">
              <button
                onClick={() => toggleIndicator("ema9")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  indicators.ema9
                    ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                EMA 9
              </button>
              <button
                onClick={() => toggleIndicator("ema21")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  indicators.ema21
                    ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                EMA 21
              </button>
              <button
                onClick={() => toggleIndicator("ema50")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  indicators.ema50
                    ? "border-pink-500/50 bg-pink-500/20 text-pink-400"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                EMA 50
              </button>
              <button
                onClick={() => toggleIndicator("ema200")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  indicators.ema200
                    ? "border-purple-500/50 bg-purple-500/20 text-purple-400"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                EMA 200
              </button>
              <button
                onClick={() => toggleIndicator("bb")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  indicators.bb
                    ? "border-sky-500/50 bg-sky-500/20 text-sky-400"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                BB (20,2)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Container */}
      <div ref={containerRef} className="w-full relative" style={{ height }} />
    </div>
  )
}
