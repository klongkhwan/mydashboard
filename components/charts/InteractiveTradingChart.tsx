"use client"

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react"
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  LineStyle,
  CrosshairMode,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts"
import {
  CandleData,
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
} from "@/lib/indicators"
import {
  Search,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Bookmark,
  Layers,
  X,
  Plus,
  Trash2,
  Check,
  Loader2,
  Activity,
  ChevronDown,
  Target,
  Minus,
  Eraser,
  Magnet,
  Crosshair,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Bell,
  BellRing,
  BellOff,
  Mail,
  Send,
  Clock,
} from "lucide-react"
import {
  getChartSettings,
  saveChartSettings,
  type ChartSettings,
  type CustomPriceLine,
} from "@/app/dashboard/investment/chart/actions"
import {
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  togglePriceAlertStatus,
  testSendPriceAlertEmail,
  checkAndTriggerPriceAlerts,
  getUserEmail,
  type PriceAlert,
} from "@/app/dashboard/investment/chart/alert-actions"

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

type ChartType = "candles" | "line" | "area" | "bars"
type ScaleMode = "normal" | "log" | "percent"

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
]

const DEFAULT_WATCHLIST = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "SUIUSDT",
  "PAXGUSDT",
]

const COLOR_OPTIONS = [
  { label: "Blue", value: "#2962ff" },
  { label: "Green", value: "#089981" },
  { label: "Red", value: "#f23645" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Purple", value: "#a855f7" },
]

export function InteractiveTradingChart({
  initialSymbol = "BTCUSDT",
  initialInterval = "15m",
  trade = null,
  height = 680,
  className = "",
  showControls = true,
}: InteractiveTradingChartProps) {
  const outerWrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const activePriceLinesRef = useRef<IPriceLine[]>([])

  // Core chart states
  const [symbol, setSymbol] = useState<string>(
    typeof trade?.symbol === "string" && trade.symbol ? trade.symbol.toUpperCase() : initialSymbol
  )
  const [interval, setIntervalState] = useState<string>(initialInterval)
  const [chartType, setChartType] = useState<ChartType>("candles")
  const [scaleMode, setScaleMode] = useState<ScaleMode>("normal")
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true)
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [lastPrice, setLastPrice] = useState<{ open: number; high: number; low: number; close: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Crosshair and tools state
  const [isMagnet, setIsMagnet] = useState<boolean>(false)
  const [isDrawingsHidden, setIsDrawingsHidden] = useState<boolean>(false)
  const [activeTool, setActiveTool] = useState<"cursor" | "horizontal_line" | "alert" | "eraser">("cursor")
  const activeToolRef = useRef<"cursor" | "horizontal_line" | "alert" | "eraser">("cursor")
  const isMagnetRef = useRef<boolean>(false)
  const cleanSymbolRef = useRef<string>("")

  // Watchlist state & live ticker data
  const [watchlistGroups, setWatchlistGroups] = useState<Record<string, string[]>>({
    Main: DEFAULT_WATCHLIST,
  })
  const [activeWatchlistGroup, setActiveWatchlistGroup] = useState<string>("Main")
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST)
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(true)
  const [newWatchlistSymbol, setNewWatchlistSymbol] = useState<string>("")
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false)
  const [newGroupName, setNewGroupName] = useState<string>("")
  const [watchlistTickers, setWatchlistTickers] = useState<Record<string, { price: number; change: number }>>({})
  const [isWatchlistWsConnected, setIsWatchlistWsConnected] = useState<boolean>(false)
  const [selectedTickerDetail, setSelectedTickerDetail] = useState<{
    high: number
    low: number
    volume: number
    quoteVolume: number
  } | null>(null)

  // Modals & Popovers state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [searchSymbolInput, setSearchSymbolInput] = useState<string>("")
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState<boolean>(false)
  const [isLevelsOpen, setIsLevelsOpen] = useState<boolean>(false)
  const [isChartTypeMenuOpen, setIsChartTypeMenuOpen] = useState<boolean>(false)

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false)
  const [alertTab, setAlertTab] = useState<"create" | "active" | "history">("create")
  const [alertSymbol, setAlertSymbol] = useState<string>("")
  const [alertTargetPrice, setAlertTargetPrice] = useState<string>("")
  const [alertCondition, setAlertCondition] = useState<"crosses_above" | "crosses_below">("crosses_above")
  const [alertEmail, setAlertEmail] = useState<string>("")
  const [alertNote, setAlertNote] = useState<string>("")
  const [isSubmittingAlert, setIsSubmittingAlert] = useState<boolean>(false)
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false)
  const [testEmailFeedback, setTestEmailFeedback] = useState<string | null>(null)
  const [liveAlertBanner, setLiveAlertBanner] = useState<{
    symbol: string
    target: number
    price: number
    email: string
  } | null>(null)

  // Refs for tracking alerts during live WebSocket events without stale closure
  const alertsRef = useRef<PriceAlert[]>([])
  alertsRef.current = alerts
  const triggeredIdsRef = useRef<Set<string>>(new Set())

  // Custom price lines (Support / Resistance)
  const [priceLines, setPriceLines] = useState<Record<string, CustomPriceLine[]>>({})
  const [newLevelPrice, setNewLevelPrice] = useState<string>("")
  const [newLevelTitle, setNewLevelTitle] = useState<string>("")
  const [newLevelColor, setNewLevelColor] = useState<string>("#2962ff")

  // Undo / Redo history for price lines
  const [undoStack, setUndoStack] = useState<Record<string, CustomPriceLine[]>[]>([])
  const [redoStack, setRedoStack] = useState<Record<string, CustomPriceLine[]>[]>([])

  // Cloud saving state
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [, setLastSaved] = useState<Date | null>(null)

  // Keep drawing tool refs up to date
  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  useEffect(() => {
    isMagnetRef.current = isMagnet
  }, [isMagnet])

  // Cancel active drawing tool on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTool("cursor")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Active indicators state
  const [indicators, setIndicators] = useState({
    ema9: true,
    ema21: true,
    ema50: false,
    ema200: false,
    sma20: false,
    bb: false,
    rsi: false,
    volume: true,
  })

  // Format symbol to Binance standard (e.g. BTC -> BTCUSDT)
  const cleanSymbol = useMemo<string>(() => {
    let s = (typeof symbol === "string" && symbol ? symbol : "BTCUSDT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!s.endsWith("USDT") && !s.endsWith("BUSD") && !s.endsWith("USDC")) {
      s += "USDT"
    }
    return s || "BTCUSDT"
  }, [symbol])

  cleanSymbolRef.current = cleanSymbol
  useEffect(() => {
    cleanSymbolRef.current = cleanSymbol
  }, [cleanSymbol])

  // Asset display name
  const assetName = useMemo<string>(() => {
    const base = cleanSymbol.replace(/USDT$|BUSD$|USDC$/, "")
    const names: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      SOL: "Solana",
      BNB: "BNB",
      XRP: "Ripple",
      DOGE: "Dogecoin",
      AVAX: "Avalanche",
      SUI: "Sui",
      PAXG: "Pax Gold",
      ADA: "Cardano",
      PEPE: "Pepe",
      LINK: "Chainlink",
      NEAR: "Near Protocol",
    }
    return names[base] ? `${names[base]} / TetherUS` : `${base} / TetherUS`
  }, [cleanSymbol])

  // Current symbol's price lines (strictly sanitized array)
  const currentSymbolLines = useMemo<CustomPriceLine[]>(() => {
    const lines = priceLines[cleanSymbol]
    if (!Array.isArray(lines)) return []
    return lines.filter(
      (l): l is CustomPriceLine => !!l && typeof l === "object" && typeof l.price === "number" && !isNaN(l.price)
    )
  }, [priceLines, cleanSymbol])

  // Sync symbol when trade prop changes
  useEffect(() => {
    if (trade?.symbol && typeof trade.symbol === "string") {
      setSymbol(trade.symbol)
    }
  }, [trade?.symbol])

  // Load user email and alerts on mount
  useEffect(() => {
    getUserEmail().then((email) => {
      if (email) setAlertEmail(email)
    })
    getPriceAlerts().then((data) => {
      if (Array.isArray(data)) setAlerts(data)
    })
  }, [])

  // Listen to browser fullscreenchange event
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (chartRef.current && containerRef.current) {
        setTimeout(() => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
              height: document.fullscreenElement ? window.innerHeight - 80 : height,
            })
          }
        }, 50)
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [height])

  // Load preferences from Supabase & localStorage with defensive parsing
  const isLoaded = useRef(false)
  useEffect(() => {
    let active = true

    function sanitizeSettings(parsed: any) {
      if (!parsed || typeof parsed !== "object") return
      if (typeof parsed.symbol === "string" && parsed.symbol && !trade?.symbol) {
        setSymbol(parsed.symbol)
      }
      if (typeof parsed.interval === "string" && parsed.interval) {
        setIntervalState(parsed.interval)
      }
      if (
        typeof parsed.chartType === "string" &&
        ["candles", "bars", "line", "area"].includes(parsed.chartType)
      ) {
        setChartType(parsed.chartType as ChartType)
      }
      if (
        typeof parsed.scaleMode === "string" &&
        ["normal", "log", "percent"].includes(parsed.scaleMode)
      ) {
        setScaleMode(parsed.scaleMode as ScaleMode)
      }
      if (parsed.indicators && typeof parsed.indicators === "object") {
        setIndicators((prev) => ({ ...prev, ...parsed.indicators }))
      }
      if (
        parsed.watchlistGroups &&
        typeof parsed.watchlistGroups === "object" &&
        !Array.isArray(parsed.watchlistGroups)
      ) {
        const cleanGroups: Record<string, string[]> = {}
        for (const [k, v] of Object.entries(parsed.watchlistGroups)) {
          if (typeof k === "string" && Array.isArray(v)) {
            cleanGroups[k] = v.filter(
              (s: any): s is string => typeof s === "string" && s.trim().length > 0
            )
          }
        }
        if (Object.keys(cleanGroups).length > 0) {
          setWatchlistGroups(cleanGroups)
          const targetGrp =
            parsed.activeWatchlistGroup && cleanGroups[parsed.activeWatchlistGroup]
              ? parsed.activeWatchlistGroup
              : Object.keys(cleanGroups)[0]
          setActiveWatchlistGroup(targetGrp)
          setWatchlist(cleanGroups[targetGrp] || [])
        }
      } else if (Array.isArray(parsed.watchlist)) {
        const cleanWl = parsed.watchlist.filter(
          (s: any): s is string => typeof s === "string" && s.trim().length > 0
        )
        if (cleanWl.length > 0) {
          setWatchlist(cleanWl)
          setWatchlistGroups({ Main: cleanWl })
          setActiveWatchlistGroup("Main")
        }
      }
      if (parsed.priceLines && typeof parsed.priceLines === "object" && !Array.isArray(parsed.priceLines)) {
        const cleanLines: Record<string, CustomPriceLine[]> = {}
        for (const [k, v] of Object.entries(parsed.priceLines)) {
          if (Array.isArray(v)) {
            cleanLines[k] = v.filter(
              (l: any): l is CustomPriceLine =>
                !!l && typeof l === "object" && typeof l.price === "number" && !isNaN(l.price)
            )
          }
        }
        setPriceLines(cleanLines)
      }
    }

    async function loadPreferences() {
      try {
        const local = localStorage.getItem("superlboard_chart_settings")
        if (local) {
          sanitizeSettings(JSON.parse(local))
        }
      } catch {}

      try {
        const remote = await getChartSettings()
        if (active && remote && typeof remote === "object") {
          sanitizeSettings(remote)
          try {
            localStorage.setItem("superlboard_chart_settings", JSON.stringify(remote))
          } catch {}
        }
      } catch {} finally {
        if (active) isLoaded.current = true
      }
    }

    loadPreferences()
    return () => {
      active = false
    }
  }, [trade?.symbol])

  // Debounced auto-save preferences to Supabase & localStorage
  useEffect(() => {
    if (!isLoaded.current) return
    const payload: ChartSettings = {
      symbol,
      interval,
      chartType,
      scaleMode,
      indicators,
      watchlist,
      watchlistGroups,
      activeWatchlistGroup,
      priceLines,
    }

    try {
      localStorage.setItem("superlboard_chart_settings", JSON.stringify(payload))
    } catch {}

    setIsSaving(true)
    const timer = setTimeout(async () => {
      try {
        await saveChartSettings(payload)
      } catch {}
      setIsSaving(false)
      setLastSaved(new Date())
    }, 1200)

    return () => clearTimeout(timer)
  }, [symbol, interval, chartType, scaleMode, indicators, watchlist, watchlistGroups, activeWatchlistGroup, priceLines])

  // Live WebSocket + periodic fallback ticker prices & % changes for watchlist
  useEffect(() => {
    let active = true
    let ws: WebSocket | null = null

    async function fetchWatchlistTickers() {
      if (watchlist.length === 0) return
      try {
        const symbolsParam = JSON.stringify(watchlist)
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`
        )
        if (!res.ok) return
        const data = await res.json()
        if (active && Array.isArray(data)) {
          const map: Record<string, { price: number; change: number }> = {}
          data.forEach((item: any) => {
            if (item && item.symbol) {
              map[item.symbol] = {
                price: parseFloat(item.lastPrice) || 0,
                change: parseFloat(item.priceChangePercent) || 0,
              }
            }
          })
          setWatchlistTickers((prev) => ({ ...prev, ...map }))
        }
      } catch {}
    }

    // 1. Immediate HTTP fetch to populate initial data on mount/change
    fetchWatchlistTickers()

    // 2. Real-time Binance Combined WebSocket Stream
    const validSymbols = watchlist.filter((s) => typeof s === "string" && s.trim().length > 0)
    if (validSymbols.length > 0) {
      const streams = validSymbols.map((s) => `${s.toLowerCase()}@ticker`).join("/")
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
        ws.onopen = () => {
          if (active) setIsWatchlistWsConnected(true)
        }
        ws.onclose = () => {
          if (active) setIsWatchlistWsConnected(false)
        }
        ws.onerror = () => {
          if (active) setIsWatchlistWsConnected(false)
        }
        ws.onmessage = (event) => {
          if (!active) return
          try {
            const parsed = JSON.parse(event.data)
            const d = parsed?.data
            if (d && d.s && d.c) {
              const sym = d.s
              const price = parseFloat(d.c) || 0
              const change = parseFloat(d.P) || 0
              setWatchlistTickers((prev) => ({
                ...prev,
                [sym]: { price, change },
              }))
            }
          } catch {}
        }
      } catch (err) {
        console.warn("Watchlist WebSocket init failed", err)
      }
    }

    // 3. Fallback polling every 20 seconds if socket drops
    const timer = window.setInterval(fetchWatchlistTickers, 20000)

    return () => {
      active = false
      window.clearInterval(timer)
      if (ws) {
        ws.close()
      }
      setIsWatchlistWsConnected(false)
    }
  }, [watchlist])

  // Fetch detailed 24h statistics for the active symbol (for TradingView detail card)
  useEffect(() => {
    let active = true
    async function fetchDetail() {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(cleanSymbol)}`
        )
        if (!res.ok) return
        const d = await res.json()
        if (active && d && d.symbol) {
          setSelectedTickerDetail({
            high: parseFloat(d.highPrice) || 0,
            low: parseFloat(d.lowPrice) || 0,
            volume: parseFloat(d.volume) || 0,
            quoteVolume: parseFloat(d.quoteVolume) || 0,
          })
        }
      } catch {}
    }
    fetchDetail()
    const timer = window.setInterval(fetchDetail, 8000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [cleanSymbol])

  // ==========================================
  // 1. Chart Initialization Effect (Runs once)
  // ==========================================
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#131722" },
        textColor: "#787b86",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.4)" },
        horzLines: { color: "rgba(42, 46, 57, 0.4)" },
      },
      crosshair: {
        mode: isMagnet ? CrosshairMode.Magnet : CrosshairMode.Normal,
        vertLine: { color: "rgba(255, 255, 255, 0.25)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(255, 255, 255, 0.25)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "rgba(42, 46, 57, 0.8)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
        mode:
          scaleMode === "log"
            ? PriceScaleMode.Logarithmic
            : scaleMode === "percent"
            ? PriceScaleMode.Percentage
            : PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: "rgba(42, 46, 57, 0.8)",
        timeVisible: true,
        secondsVisible: false,
      },
      height: isFullscreen ? window.innerHeight - 80 : height,
    })

    chartRef.current = chart

    // Add Volume Series (Histogram) in separate scale overlay
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })
    volumeSeriesRef.current = volumeSeries

    // Crosshair move handler to update OHLC display only when moving across candles
    let lastCrosshairBar: any = null
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || param.time === lastCrosshairBar) {
        return
      }
      lastCrosshairBar = param.time
      if (mainSeriesRef.current && param.seriesData.has(mainSeriesRef.current)) {
        const data = param.seriesData.get(mainSeriesRef.current) as any
        if (data && typeof data.close === "number") {
          setLastPrice({
            open: typeof data.open === "number" ? data.open : data.close,
            high: typeof data.high === "number" ? data.high : data.close,
            low: typeof data.low === "number" ? data.low : data.close,
            close: data.close,
          })
        }
      }
    })

    // Chart click listener for drawing tools
    const handleChartClick = (param: any) => {
      const tool = activeToolRef.current
      if (tool === "cursor") return

      const point = param.point
      if (!point) return
      const series = mainSeriesRef.current
      if (!series) return

      const rawPrice = series.coordinateToPrice(point.y)
      if (rawPrice === null || rawPrice === undefined) return
      let clickedPrice: number = Number(rawPrice)
      if (isNaN(clickedPrice)) return

      // Magnet mode snapping to OHLC
      if (isMagnetRef.current) {
        const candle = param.seriesData.get(series) as any
        if (candle && typeof candle.close === "number") {
          const ohlc: number[] = [candle.open, candle.high, candle.low, candle.close].filter((v): v is number => typeof v === "number")
          if (ohlc.length > 0) {
            clickedPrice = ohlc.reduce((prev, curr) =>
              Math.abs(curr - clickedPrice) < Math.abs(prev - clickedPrice) ? curr : prev
            )
          }
        }
      }

      const roundedPrice =
        clickedPrice >= 1 ? parseFloat(clickedPrice.toFixed(2)) : parseFloat(clickedPrice.toFixed(4))

      // 1. Horizontal Support/Resistance Line
      if (tool === "horizontal_line") {
        const newLine: CustomPriceLine = {
          id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          price: roundedPrice,
          title: `Level $${roundedPrice.toLocaleString()}`,
          color: "#2962ff",
        }
        setPriceLines((prev) => {
          const sym = cleanSymbolRef.current
          const existing = prev[sym] || []
          return {
            ...prev,
            [sym]: [...existing, newLine],
          }
        })
        return
      }

      // 2. Alert Tool
      if (tool === "alert") {
        setAlertTargetPrice(roundedPrice.toString())
        setIsAlertsOpen(true)
        setActiveTool("cursor")
        return
      }

      // 3. Eraser Tool
      if (tool === "eraser") {
        const sym = cleanSymbolRef.current
        setPriceLines((prev) => {
          const list = prev[sym] || []
          if (list.length === 0) return prev
          return {
            ...prev,
            [sym]: list.filter((l) => Math.abs(l.price - roundedPrice) / roundedPrice > 0.012),
          }
        })
        return
      }
    }

    chart.subscribeClick(handleChartClick)

    // ResizeObserver for fluid width & height responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !entries[0].contentRect) return
      const { width } = entries[0].contentRect
      const observedHeight = containerRef.current?.clientHeight || height
      chart.applyOptions({ width, height: isFullscreen ? observedHeight : height })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.unsubscribeClick(handleChartClick)
      chart.remove()
      chartRef.current = null
      mainSeriesRef.current = null
      volumeSeriesRef.current = null
      indicatorSeriesRef.current.clear()
      activePriceLinesRef.current = []
    }
  }, [height, isFullscreen])

  // Apply Magnet / Normal crosshair changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        crosshair: {
          mode: isMagnet ? CrosshairMode.Magnet : CrosshairMode.Normal,
        },
      })
    }
  }, [isMagnet])

  // Apply Scale Mode changes (Normal, Log, Percent)
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.priceScale("right").applyOptions({
        mode:
          scaleMode === "log"
            ? PriceScaleMode.Logarithmic
            : scaleMode === "percent"
            ? PriceScaleMode.Percentage
            : PriceScaleMode.Normal,
      })
    }
  }, [scaleMode])

  // ==========================================
  // 2. Main Series Switcher (Candles, Line, Area, Bars)
  // ==========================================
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Remove old main series
    if (mainSeriesRef.current) {
      activePriceLinesRef.current = []
      chart.removeSeries(mainSeriesRef.current)
      mainSeriesRef.current = null
    }

    let series: ISeriesApi<any>
    if (chartType === "line") {
      series = chart.addSeries(LineSeries, {
        color: "#2962ff",
        lineWidth: 2,
      })
    } else if (chartType === "area") {
      series = chart.addSeries(AreaSeries, {
        topColor: "rgba(41, 98, 255, 0.4)",
        bottomColor: "rgba(41, 98, 255, 0.0)",
        lineColor: "#2962ff",
        lineWidth: 2,
      })
    } else if (chartType === "bars") {
      series = chart.addSeries(BarSeries, {
        upColor: "#089981",
        downColor: "#f23645",
      })
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: "#089981",
        downColor: "#f23645",
        borderVisible: false,
        wickUpColor: "#089981",
        wickDownColor: "#f23645",
      })
    }

    mainSeriesRef.current = series

    // If candles already loaded, set data on the newly created series
    if (candleData.length > 0) {
      if (chartType === "line" || chartType === "area") {
        series.setData(candleData.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })))
      } else {
        series.setData(
          candleData.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        )
      }
    }
  }, [chartType])

  // Trigger live alert callback
  const handleTriggerLiveAlert = useCallback(
    async (alert: PriceAlert, currentPrice: number) => {
      setLiveAlertBanner({
        symbol: alert.symbol,
        target: alert.target_price,
        price: currentPrice,
        email: alert.email,
      })

      // Update local alert status
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, status: "triggered", triggered_at: new Date().toISOString() } : a))
      )

      // Trigger backend server action to update DB and send real email
      await checkAndTriggerPriceAlerts(alert.symbol, currentPrice)
    },
    []
  )

  // ==========================================
  // 3. Historical Candles & WebSocket Connection
  // ==========================================
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    let ws: WebSocket | null = null
    let isCancelled = false

    async function loadData() {
      setIsLoadingCandles(true)
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=500`
        )
        if (isCancelled) return

        if (!res.ok) {
          setIsLoadingCandles(false)
          return
        }

        const raw = await res.json()
        if (isCancelled || !Array.isArray(raw)) return

        const candles: CandleData[] = raw.map((k: any) => ({
          time: Math.floor(k[0] / 1000) as UTCTimestamp,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }))

        setCandleData(candles)

        // Set Main Series Data
        const ms = mainSeriesRef.current
        if (ms && candles.length > 0) {
          if (chartType === "line" || chartType === "area") {
            ms.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })))
          } else {
            ms.setData(
              candles.map((c) => ({
                time: c.time as UTCTimestamp,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
              }))
            )
          }
        }

        // Set Volume Data
        const vs = volumeSeriesRef.current
        if (vs && candles.length > 0) {
          vs.setData(
            candles.map((c) => ({
              time: c.time as UTCTimestamp,
              value: c.volume || 0,
              color: c.close >= c.open ? "rgba(8, 153, 129, 0.4)" : "rgba(242, 54, 69, 0.4)",
            }))
          )
        }

        // Set Initial lastPrice
        if (candles.length > 0) {
          const last = candles[candles.length - 1]
          setLastPrice({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
          })
        }

        chart?.timeScale().fitContent()
        setIsLoadingCandles(false)

        // Connect Binance WebSocket for live real-time price tick
        const streamName = `${cleanSymbol.toLowerCase()}@kline_${interval}`
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamName}`)

        ws.onopen = () => {
          if (!isCancelled) setIsConnected(true)
        }

        ws.onclose = () => {
          if (!isCancelled) setIsConnected(false)
        }

        ws.onerror = () => {
          if (!isCancelled) setIsConnected(false)
        }

        ws.onmessage = (event) => {
          if (isCancelled) return
          try {
            const msg = JSON.parse(event.data)
            if (msg.e === "kline") {
              const k = msg.k
              const currentClose = parseFloat(k.c)
              const newCandle: CandleData = {
                time: Math.floor(k.t / 1000) as UTCTimestamp,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: currentClose,
                volume: parseFloat(k.v),
              }

              // Update main chart series
              const series = mainSeriesRef.current
              if (series) {
                if (chartType === "line" || chartType === "area") {
                  series.update({ time: newCandle.time as UTCTimestamp, value: newCandle.close })
                } else {
                  series.update(newCandle as any)
                }
              }

              // Update volume series
              const vol = volumeSeriesRef.current
              if (vol) {
                vol.update({
                  time: newCandle.time as UTCTimestamp,
                  value: newCandle.volume || 0,
                  color: newCandle.close >= newCandle.open ? "rgba(8, 153, 129, 0.4)" : "rgba(242, 54, 69, 0.4)",
                })
              }

              setLastPrice({
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: currentClose,
              })

              // Check active price alerts for this symbol in real-time
              const currentActiveAlerts = alertsRef.current.filter(
                (a) => a.status === "active" && a.symbol === cleanSymbol
              )

              for (const alert of currentActiveAlerts) {
                let isTriggered = false
                if (alert.condition === "crosses_above" || alert.condition === "greater_than") {
                  if (currentClose >= alert.target_price) isTriggered = true
                } else if (alert.condition === "crosses_below" || alert.condition === "less_than") {
                  if (currentClose <= alert.target_price) isTriggered = true
                }

                if (isTriggered && !triggeredIdsRef.current.has(alert.id)) {
                  triggeredIdsRef.current.add(alert.id)
                  handleTriggerLiveAlert(alert, currentClose)
                }
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error("Error loading candles", err)
        if (!isCancelled) setIsLoadingCandles(false)
      }
    }

    loadData()

    return () => {
      isCancelled = true
      if (ws) ws.close()
    }
  }, [cleanSymbol, interval, chartType, handleTriggerLiveAlert])

  // ==========================================
  // 4. Custom Support & Resistance Price Lines
  // ==========================================
  const syncPriceLines = useCallback(() => {
    const series = mainSeriesRef.current
    if (!series) return

    // Clear old lines
    activePriceLinesRef.current.forEach((pl) => {
      try {
        series.removePriceLine(pl)
      } catch {}
    })
    activePriceLinesRef.current = []

    if (isDrawingsHidden) return

    // Add current lines
    currentSymbolLines.forEach((item) => {
      try {
        const pl = series.createPriceLine({
          price: item.price,
          color: item.color || "#2962ff",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: typeof item.title === "string" ? item.title : "",
        })
        activePriceLinesRef.current.push(pl)
      } catch {}
    })
  }, [currentSymbolLines, isDrawingsHidden])

  useEffect(() => {
    syncPriceLines()
  }, [syncPriceLines, candleData, chartType])

  // ==========================================
  // 5. Indicators Effect (Triggered on candleData or indicator toggles)
  // ==========================================
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || candleData.length === 0) return

    const activeMap = indicatorSeriesRef.current

    // Helper to sync moving averages
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

    // Moving Averages
    syncLine("ema9", indicators.ema9, "#2962ff", 1, calculateEMA(candleData, 9))
    syncLine("ema21", indicators.ema21, "#f59e0b", 1, calculateEMA(candleData, 21))
    syncLine("ema50", indicators.ema50, "#ec4899", 2, calculateEMA(candleData, 50))
    syncLine("ema200", indicators.ema200, "#8b5cf6", 2, calculateEMA(candleData, 200))
    syncLine("sma20", indicators.sma20, "#eab308", 1, calculateSMA(candleData, 20))

    // Bollinger Bands
    const bb = calculateBollingerBands(candleData, 20, 2)
    syncLine("bbUpper", indicators.bb, "rgba(41, 98, 255, 0.6)", 1, bb.upper)
    syncLine("bbMiddle", indicators.bb, "rgba(156, 163, 175, 0.5)", 1, bb.middle)
    syncLine("bbLower", indicators.bb, "rgba(41, 98, 255, 0.6)", 1, bb.lower)

    // Volume Series toggle
    const vs = volumeSeriesRef.current
    if (vs) {
      vs.applyOptions({ visible: indicators.volume })
    }

    // RSI Indicator in dedicated Pane 1
    if (indicators.rsi) {
      let rsiSeries = activeMap.get("rsi")
      if (!rsiSeries) {
        try {
          rsiSeries = chart.addSeries(
            LineSeries,
            {
              color: "#a855f7",
              lineWidth: 2,
              priceFormat: { type: "custom", formatter: (p: number) => p.toFixed(1) },
            },
            1 // Dedicated lower pane
          )
          rsiSeries.createPriceLine({
            price: 70,
            color: "rgba(242, 54, 69, 0.6)",
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "70",
          })
          rsiSeries.createPriceLine({
            price: 30,
            color: "rgba(8, 153, 129, 0.6)",
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "30",
          })
          activeMap.set("rsi", rsiSeries)
        } catch (e) {
          console.error("Pane 1 RSI error", e)
        }
      }
      if (rsiSeries) {
        const rsiData = calculateRSI(candleData, 14)
        rsiSeries.setData(rsiData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
      }
    } else {
      const rsiSeries = activeMap.get("rsi")
      if (rsiSeries) {
        chart.removeSeries(rsiSeries)
        activeMap.delete("rsi")
      }
    }
  }, [candleData, indicators])

  // Helper toggle for indicators
  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Support & Resistance Line Actions with Undo/Redo tracking
  const handleAddPriceLine = (e: React.FormEvent) => {
    e.preventDefault()
    const numericPrice = parseFloat(newLevelPrice)
    if (isNaN(numericPrice) || numericPrice <= 0) return

    const newLine: CustomPriceLine = {
      id: `pl_${Date.now()}`,
      price: numericPrice,
      title: newLevelTitle.trim() || undefined,
      color: newLevelColor,
    }

    setUndoStack((prev) => [...prev, priceLines])
    setRedoStack([])

    setPriceLines((prev) => {
      const current = Array.isArray(prev[cleanSymbol]) ? prev[cleanSymbol] : []
      return {
        ...prev,
        [cleanSymbol]: [...current, newLine],
      }
    })

    setNewLevelPrice("")
    setNewLevelTitle("")
    setIsLevelsOpen(false)
  }

  const handleQuickAddPriceLineAtCurrent = () => {
    if (!lastPrice?.close) return
    const newLine: CustomPriceLine = {
      id: `pl_${Date.now()}`,
      price: Number(lastPrice.close.toFixed(2)),
      title: `${cleanSymbol} Level`,
      color: "#2962ff",
    }

    setUndoStack((prev) => [...prev, priceLines])
    setRedoStack([])

    setPriceLines((prev) => {
      const current = Array.isArray(prev[cleanSymbol]) ? prev[cleanSymbol] : []
      return {
        ...prev,
        [cleanSymbol]: [...current, newLine],
      }
    })
  }

  const handleRemovePriceLine = (id: string) => {
    setUndoStack((prev) => [...prev, priceLines])
    setRedoStack([])

    setPriceLines((prev) => {
      const current = Array.isArray(prev[cleanSymbol]) ? prev[cleanSymbol] : []
      return {
        ...prev,
        [cleanSymbol]: current.filter((line) => line.id !== id),
      }
    })
  }

  const handleClearAllSymbolLines = () => {
    setUndoStack((prev) => [...prev, priceLines])
    setRedoStack([])

    setPriceLines((prev) => ({
      ...prev,
      [cleanSymbol]: [],
    }))
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [...prev, priceLines])
    setPriceLines(previous)
    setUndoStack((prev) => prev.slice(0, prev.length - 1))
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack((prev) => [...prev, priceLines])
    setPriceLines(next)
    setRedoStack((prev) => prev.slice(0, prev.length - 1))
  }

  // Alert Handlers
  const handleOpenAlertCreator = (prefillPrice?: number, prefillNote?: string) => {
    setAlertSymbol(cleanSymbol)
    if (prefillPrice) {
      setAlertTargetPrice(prefillPrice.toString())
    } else if (lastPrice?.close) {
      setAlertTargetPrice(lastPrice.close.toFixed(2))
    }
    if (prefillNote) setAlertNote(prefillNote)
    setAlertTab("create")
    setIsAlertsOpen(true)
  }

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetPrice = parseFloat(alertTargetPrice)
    if (isNaN(targetPrice) || targetPrice <= 0) return
    if (!alertEmail || !alertEmail.includes("@")) return

    setIsSubmittingAlert(true)
    const res = await createPriceAlert({
      symbol: alertSymbol || cleanSymbol,
      target_price: targetPrice,
      condition: alertCondition,
      email: alertEmail,
      note: alertNote || undefined,
      last_price_at_creation: lastPrice?.close,
    })

    setIsSubmittingAlert(false)
    if (res.success && res.alert) {
      setAlerts((prev) => [res.alert!, ...prev])
      setAlertTab("active")
      setAlertNote("")
    }
  }

  const handleToggleAlert = async (id: string, currentStatus: "active" | "paused" | "triggered") => {
    const nextStatus = currentStatus === "active" ? "paused" : "active"
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
    )
    await togglePriceAlertStatus(id, nextStatus)
  }

  const handleDeleteAlert = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    await deletePriceAlert(id)
  }

  const handleTestEmail = async () => {
    if (!alertEmail || !alertEmail.includes("@")) {
      setTestEmailFeedback("กรุณาระบุอีเมลที่ถูกต้องก่อน")
      return
    }

    setIsTestingEmail(true)
    setTestEmailFeedback(null)

    const price = parseFloat(alertTargetPrice) || (lastPrice?.close ?? 90000)
    const res = await testSendPriceAlertEmail(alertEmail, alertSymbol || cleanSymbol, price)

    setIsTestingEmail(false)
    if (res.success) {
      setTestEmailFeedback(
        res.simulated
          ? "✅ ทดสอบสำเร็จ (Dev Mode: ดูผลลัพธ์ใน Server Console)"
          : `✅ ส่งอีเมลแจ้งเตือนตัวอย่างไปที่ ${alertEmail} แล้ว!`
      )
    } else {
      setTestEmailFeedback(`❌ ส่งไม่สำเร็จ: ${res.error}`)
    }

    setTimeout(() => setTestEmailFeedback(null), 5000)
  }

  const handleSwitchGroup = (grp: string) => {
    if (watchlistGroups[grp]) {
      setActiveWatchlistGroup(grp)
      setWatchlist(watchlistGroups[grp])
    }
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newGroupName.trim()
    if (!trimmed) return
    if (watchlistGroups[trimmed]) {
      handleSwitchGroup(trimmed)
    } else {
      const updated = { ...watchlistGroups, [trimmed]: [] }
      setWatchlistGroups(updated)
      setActiveWatchlistGroup(trimmed)
      setWatchlist([])
    }
    setNewGroupName("")
    setIsNewGroupModalOpen(false)
  }

  const handleDeleteGroup = (grp: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const keys = Object.keys(watchlistGroups)
    if (keys.length <= 1) return
    const nextGroups = { ...watchlistGroups }
    delete nextGroups[grp]
    setWatchlistGroups(nextGroups)
    if (activeWatchlistGroup === grp) {
      const remainingFirst = Object.keys(nextGroups)[0]
      setActiveWatchlistGroup(remainingFirst)
      setWatchlist(nextGroups[remainingFirst] || [])
    }
  }

  const handleAddToWatchlist = (e: React.FormEvent) => {
    e.preventDefault()
    let s = newWatchlistSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!s) return
    if (!s.endsWith("USDT") && !s.endsWith("BUSD") && !s.endsWith("USDC")) {
      s += "USDT"
    }
    if (!watchlist.includes(s)) {
      const nextList = [...watchlist, s]
      setWatchlist(nextList)
      setWatchlistGroups((prev) => ({
        ...prev,
        [activeWatchlistGroup]: nextList,
      }))
    }
    setNewWatchlistSymbol("")
    setSymbol(s)
  }

  const handleRemoveFromWatchlist = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextList = watchlist.filter((item) => item !== sym)
    setWatchlist(nextList)
    setWatchlistGroups((prev) => ({
      ...prev,
      [activeWatchlistGroup]: nextList,
    }))
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let s = searchSymbolInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!s) return
    if (!s.endsWith("USDT") && !s.endsWith("BUSD") && !s.endsWith("USDC")) {
      s += "USDT"
    }
    setSymbol(s)
    setIsSearchOpen(false)
    setSearchSymbolInput("")
  }

  const handleFitContent = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }

  const handleTakeScreenshot = () => {
    if (!chartRef.current) return
    try {
      const canvas = chartRef.current.takeScreenshot()
      const link = document.createElement("a")
      link.download = `${cleanSymbol}_${interval}_TradingView.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (err) {
      console.error("Screenshot error", err)
    }
  }

  const handleToggleFullscreen = () => {
    if (!outerWrapperRef.current) return
    if (!document.fullscreenElement) {
      outerWrapperRef.current.requestFullscreen().catch(() => {
        setIsFullscreen(!isFullscreen)
      })
    } else {
      document.exitFullscreen().catch(() => {
        setIsFullscreen(false)
      })
    }
  }

  // TradingView Bottom Date Range Shortcuts (1D, 5D, 1M, 3M, 6M, 1Y, ALL)
  const handleSelectRange = (range: string) => {
    if (!chartRef.current || candleData.length === 0) return
    if (range === "ALL") {
      chartRef.current.timeScale().fitContent()
      return
    }

    const now = Math.floor(Date.now() / 1000)
    let seconds = 86400
    if (range === "1D") {
      seconds = 86400
      setIntervalState("5m")
    } else if (range === "5D") {
      seconds = 5 * 86400
      setIntervalState("15m")
    } else if (range === "1M") {
      seconds = 30 * 86400
      setIntervalState("1h")
    } else if (range === "3M") {
      seconds = 90 * 86400
      setIntervalState("4h")
    } else if (range === "6M") {
      seconds = 180 * 86400
      setIntervalState("1d")
    } else if (range === "1Y") {
      seconds = 365 * 86400
      setIntervalState("1d")
    }

    const from = Math.max(candleData[0].time, now - seconds)
    try {
      chartRef.current.timeScale().setVisibleRange({
        from: from as UTCTimestamp,
        to: now as UTCTimestamp,
      })
    } catch {
      chartRef.current.timeScale().fitContent()
    }
  }

  // Active price & ticker status
  const activeTicker = watchlistTickers[cleanSymbol]
  const isPriceUp = activeTicker ? activeTicker.change >= 0 : lastPrice ? lastPrice.close >= lastPrice.open : true

  // Count active indicators and alerts
  const activeIndicatorsCount = Object.values(indicators).filter(Boolean).length
  const activeAlerts = alerts.filter((a) => a.status === "active")
  const activeAlertsCount = activeAlerts.length
  const historyAlerts = alerts.filter((a) => a.status === "triggered")

  return (
    <div
      ref={outerWrapperRef}
      className={`relative flex flex-col rounded-xl border border-[#2a2e39] bg-[#131722] text-[#d1d4dc] overflow-hidden select-none font-sans ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""
      } ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. TOP HEADER TOOLBAR (TradingView Advanced Header Style)  */}
      {/* ========================================================= */}
      {showControls && (
        <header className="flex flex-wrap items-center justify-between border-b border-[#2a2e39] bg-[#131722] px-3 py-1.5 text-xs gap-2">
          {/* Left section: Symbol, Description, Live Badge, Market Price & OHLC */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Symbol Switcher Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] transition-all border border-[#2a2e39]"
              title="Click to search symbol (or switch pair)"
            >
              <Search className="w-3.5 h-3.5 text-[#787b86]" />
              <span className="font-bold text-white text-sm tracking-wide">{cleanSymbol}</span>
              <span className="hidden sm:inline text-[11px] text-[#787b86] truncate max-w-[130px]">
                {assetName}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-[#787b86] font-mono border border-white/5">
                BINANCE
              </span>
              <ChevronDown className="w-3 h-3 text-[#787b86]" />
            </button>

            {/* Connection badge */}
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                isConnected ? "bg-[#089981]/15 text-[#089981]" : "bg-[#2a2e39] text-[#787b86]"
              }`}
            >
              {isConnected ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
              <span>{isConnected ? "LIVE" : "SYNCING"}</span>
            </div>

            {/* Live Price & 24h Change */}
            {lastPrice && (
              <div className="flex items-center gap-2 font-mono">
                <span className={`text-sm font-bold ${isPriceUp ? "text-[#089981]" : "text-[#f23645]"}`}>
                  ${lastPrice.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {activeTicker && (
                  <span
                    className={`text-[11px] font-medium flex items-center ${
                      activeTicker.change >= 0 ? "text-[#089981]" : "text-[#f23645]"
                    }`}
                  >
                    {activeTicker.change >= 0 ? "+" : ""}
                    {activeTicker.change.toFixed(2)}%
                  </span>
                )}
              </div>
            )}

            {/* Crosshair OHLC values */}
            {lastPrice && (
              <div className="hidden xl:flex items-center gap-2.5 font-mono text-[11px] text-[#787b86] pl-2 border-l border-[#2a2e39]">
                <span>O <span className="text-white">{lastPrice.open.toFixed(2)}</span></span>
                <span>H <span className="text-[#089981]">{lastPrice.high.toFixed(2)}</span></span>
                <span>L <span className="text-[#f23645]">{lastPrice.low.toFixed(2)}</span></span>
                <span>C <span className={lastPrice.close >= lastPrice.open ? "text-[#089981]" : "text-[#f23645]"}>{lastPrice.close.toFixed(2)}</span></span>
              </div>
            )}
          </div>

          {/* Right section: Timeframes, Chart Type, fx Indicators, Alerts, Levels, Save, Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Timeframe selector */}
            <div className="flex items-center bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
              {INTERVALS.map((intv) => (
                <button
                  type="button"
                  key={intv.value}
                  onClick={() => setIntervalState(intv.value)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    interval === intv.value
                      ? "bg-[#2962ff] text-white shadow"
                      : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>

            {/* Chart Type Dropdown (Candles, Line, Area, Bars) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsChartTypeMenuOpen(!isChartTypeMenuOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#d1d4dc] border border-[#2a2e39] text-[11px]"
                title="Change chart style"
              >
                <Activity className="w-3.5 h-3.5 text-[#2962ff]" />
                <span className="capitalize hidden md:inline">{chartType}</span>
                <ChevronDown className="w-3 h-3 text-[#787b86]" />
              </button>

              {isChartTypeMenuOpen && (
                <div className="absolute top-full mt-1 left-0 z-30 w-32 rounded bg-[#1e222d] border border-[#2a2e39] p-1 shadow-2xl">
                  {(["candles", "bars", "line", "area"] as ChartType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setChartType(t)
                        setIsChartTypeMenuOpen(false)
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs capitalize transition-colors ${
                        chartType === t ? "bg-[#2962ff] text-white font-bold" : "text-[#d1d4dc] hover:bg-[#2a2e39]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TradingView's iconic fx Indicators Button */}
            <button
              type="button"
              onClick={() => setIsIndicatorsOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-all ${
                activeIndicatorsCount > 0
                  ? "border-[#2962ff]/60 bg-[#2962ff]/15 text-[#2962ff]"
                  : "border-[#2a2e39] bg-[#1e222d] text-[#787b86] hover:text-white"
              }`}
              title="Technical Indicators (EMA, SMA, BB, RSI, Volume)"
            >
              <span className="font-serif italic font-bold text-xs">fx</span>
              <span className="font-semibold">Indicators</span>
              {activeIndicatorsCount > 0 && (
                <span className="text-[10px] px-1 rounded-full bg-[#2962ff] text-white font-mono">
                  {activeIndicatorsCount}
                </span>
              )}
            </button>

            {/* Price Alerts Button with Email Dispatch */}
            <button
              type="button"
              onClick={() => handleOpenAlertCreator()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-all ${
                activeAlertsCount > 0
                  ? "border-[#f59e0b]/60 bg-[#f59e0b]/15 text-[#f59e0b]"
                  : "border-[#2a2e39] bg-[#1e222d] text-[#787b86] hover:text-white"
              }`}
              title="Price Alerts (Email Notifications)"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alerts</span>
              {activeAlertsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f59e0b] text-black font-bold font-mono">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* Key Support/Resistance Levels Button */}
            <button
              type="button"
              onClick={() => {
                if (lastPrice?.close) setNewLevelPrice(lastPrice.close.toFixed(2))
                setIsLevelsOpen(true)
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                currentSymbolLines.length > 0
                  ? "border-[#089981]/60 bg-[#089981]/15 text-[#089981]"
                  : "border-[#2a2e39] bg-[#1e222d] text-[#787b86] hover:text-white"
              }`}
              title="Manage Support & Resistance Price Lines"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Levels ({currentSymbolLines.length})</span>
            </button>

            {/* Undo / Redo Buttons */}
            <div className="flex items-center bg-[#1e222d] rounded border border-[#2a2e39]">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 text-[#787b86] hover:text-white disabled:opacity-30 disabled:hover:text-[#787b86] transition-colors"
                title="Undo (Drawing)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 text-[#787b86] hover:text-white disabled:opacity-30 disabled:hover:text-[#787b86] transition-colors border-l border-[#2a2e39]"
                title="Redo (Drawing)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cloud Auto-Save Status */}
            <div
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[10px]"
              title="Settings, levels, and indicators automatically saved to Supabase"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-[#787b86]" />
                  <span className="text-[#787b86]">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-[#089981]" />
                  <span className="text-[#089981]">Cloud Saved</span>
                </>
              )}
            </div>

            {/* Screenshot / Camera Button */}
            <button
              type="button"
              onClick={handleTakeScreenshot}
              className="p-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-all border border-[#2a2e39]"
              title="Take chart screenshot (PNG)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Reset Zoom / Fit Content */}
            <button
              type="button"
              onClick={handleFitContent}
              className="p-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-all border border-[#2a2e39]"
              title="Reset Zoom / Fit Content"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-all border border-[#2a2e39]"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Watchlist Toggle */}
            <button
              type="button"
              onClick={() => setIsWatchlistOpen(!isWatchlistOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                isWatchlistOpen
                  ? "border-[#2962ff]/60 bg-[#2962ff]/20 text-[#2962ff]"
                  : "border-[#2a2e39] bg-[#1e222d] text-[#787b86] hover:text-white"
              }`}
              title="Toggle Watchlist Sidebar"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Watchlist</span>
            </button>
          </div>
        </header>
      )}

      {/* ========================================================= */}
      {/* 2. MAIN BODY (Left Tools Rail + Chart Canvas + Watchlist) */}
      {/* ========================================================= */}
      <div className="relative flex flex-1 w-full overflow-hidden bg-[#131722]">
        {/* Left Drawing & Quick Tools Rail (Full Functional TradingView Tools) */}
        <aside className="w-10 border-r border-[#2a2e39] bg-[#131722] flex flex-col items-center py-2 gap-1.5 flex-shrink-0 z-10 select-none">
          {/* 1. Cursor / Select */}
          <button
            type="button"
            onClick={() => setActiveTool("cursor")}
            className={`p-2 rounded transition-all ${
              activeTool === "cursor"
                ? "bg-[#2962ff]/20 text-[#2962ff]"
                : "hover:bg-[#2a2e39] text-[#787b86] hover:text-white"
            }`}
            title="Cursor / Select (Normal Navigation)"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* 2. Horizontal Line Tool */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === "horizontal_line" ? "cursor" : "horizontal_line")}
            className={`p-2 rounded transition-all ${
              activeTool === "horizontal_line"
                ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 ring-2 ring-[#2962ff]/50"
                : "hover:bg-[#2a2e39] text-[#787b86] hover:text-[#2962ff]"
            }`}
            title="Horizontal Line (Click on chart to place S&R level)"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* 3. Set Price Alert Tool */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === "alert" ? "cursor" : "alert")}
            className={`p-2 rounded transition-all ${
              activeTool === "alert"
                ? "bg-[#f59e0b] text-white shadow-md shadow-[#f59e0b]/30 ring-2 ring-[#f59e0b]/50"
                : "hover:bg-[#2a2e39] text-[#787b86] hover:text-[#f59e0b]"
            }`}
            title="Price Alert Tool (Click on chart to create alert at price)"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* 4. Eraser Tool */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === "eraser" ? "cursor" : "eraser")}
            className={`p-2 rounded transition-all ${
              activeTool === "eraser"
                ? "bg-[#f23645] text-white shadow-md shadow-[#f23645]/30 ring-2 ring-[#f23645]/50"
                : "hover:bg-[#2a2e39] text-[#787b86] hover:text-[#f23645]"
            }`}
            title="Eraser (Click on any line to remove)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="w-5 h-[1px] bg-[#2a2e39] my-0.5" />

          {/* 5. Magnet Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsMagnet(!isMagnet)}
            className={`p-2 rounded transition-all ${
              isMagnet
                ? "bg-[#2962ff]/20 text-[#2962ff] ring-1 ring-[#2962ff]"
                : "hover:bg-[#2a2e39] text-[#787b86] hover:text-white"
            }`}
            title={isMagnet ? "Magnet Mode: ON (Snaps to High/Low/Close)" : "Magnet Mode: OFF (Click freely)"}
          >
            <Magnet className="w-4 h-4" />
          </button>

          {/* 6. S&R Levels Manager Modal */}
          <button
            type="button"
            onClick={() => {
              if (lastPrice?.close) setNewLevelPrice(lastPrice.close.toFixed(2))
              setIsLevelsOpen(true)
            }}
            className="p-2 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#089981] transition-all"
            title="Support & Resistance Manager Table"
          >
            <Target className="w-4 h-4" />
          </button>

          {/* 7. Hide/Show All Drawings (Eye) */}
          <button
            type="button"
            onClick={() => setIsDrawingsHidden(!isDrawingsHidden)}
            className={`p-2 rounded transition-all ${
              isDrawingsHidden
                ? "bg-[#f23645]/20 text-[#f23645]"
                : "hover:bg-[#2a2e39] text-[#787b86] hover:text-white"
            }`}
            title={isDrawingsHidden ? "Show All Drawings" : "Hide All Drawings"}
          >
            {isDrawingsHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* 8. Clear All Lines for Current Symbol */}
          {currentSymbolLines.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllSymbolLines}
              className="p-2 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#f23645] transition-all"
              title="Clear all price lines for current symbol"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* 9. Fit Screen */}
          <button
            type="button"
            onClick={handleFitContent}
            className="p-2 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-white transition-all"
            title="Fit Screen (Reset Zoom)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </aside>

        {/* Center: Chart Canvas with Top Overlay Legend, Live Alert Banner & Loading Overlay */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col">
          {isLoadingCandles && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#131722]/70 backdrop-blur-xs">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e222d] border border-[#2a2e39] shadow-xl text-xs font-medium text-[#d1d4dc]">
                <Loader2 className="w-4 h-4 animate-spin text-[#2962ff]" />
                <span>Loading {cleanSymbol} {interval} candles...</span>
              </div>
            </div>
          )}

          {/* Active Drawing Tool Floating Banner / Instruction Pill */}
          {activeTool !== "cursor" && (
            <div className="absolute top-3 left-4 z-25 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#1e222d]/95 border border-[#2962ff] shadow-xl text-xs text-white backdrop-blur-md animate-in fade-in slide-in-from-top-2">
              <span className="w-2 h-2 rounded-full bg-[#2962ff] animate-ping" />
              {activeTool === "horizontal_line" && (
                <span>✏️ <b>คลิกบนกราฟ</b> เพื่อวางเส้นแนวรับแนวต้าน</span>
              )}
              {activeTool === "alert" && (
                <span>🔔 <b>คลิกบนกราฟ</b> ตรงระดับราคาที่ต้องการตั้งแจ้งเตือน</span>
              )}
              {activeTool === "eraser" && (
                <span>🧹 <b>คลิกที่เส้นบนกราฟ</b> เพื่อลบเส้นนั้นออก</span>
              )}
              <button
                type="button"
                onClick={() => setActiveTool("cursor")}
                className="p-0.5 rounded-full hover:bg-white/10 text-[#787b86] hover:text-white transition-colors ml-1"
                title="ออก (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Real-time In-Chart Alert Trigger Banner */}
          {liveAlertBanner && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-lg w-11/12 bg-[#1e222d]/95 border-2 border-[#f59e0b] rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white backdrop-blur-md animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <BellRing className="w-5 h-5 text-[#f59e0b] animate-bounce shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-[#f59e0b]">
                    🚨 แจ้งเตือนราคา: {liveAlertBanner.symbol} แตะ ${liveAlertBanner.price.toLocaleString()}!
                  </div>
                  <div className="text-[11px] text-[#d1d4dc] truncate">
                    เป้าหมาย ${liveAlertBanner.target.toLocaleString()} &middot; ส่งอีเมลไปที่ {liveAlertBanner.email} เรียบร้อย
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveAlertBanner(null)}
                className="px-2.5 py-1 rounded bg-[#2a2e39] hover:bg-white/10 text-xs text-[#787b86] hover:text-white shrink-0"
              >
                รับทราบ
              </button>
            </div>
          )}

          {/* Lightweight Chart Container */}
          <div
            ref={containerRef}
            className={`w-full flex-1 relative ${
              activeTool !== "cursor" ? "cursor-crosshair" : ""
            }`}
            style={{ height: isFullscreen ? "calc(100vh - 80px)" : height }}
          />

          {/* TradingView Top-Left Legend Overlay (Indicator Chips with quick delete) */}
          <div className={`absolute ${activeTool !== "cursor" ? "top-12" : "top-2"} left-2 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto select-none transition-all`}>
            {indicators.ema9 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d]/80 backdrop-blur-xs border border-[#2962ff]/40 text-[10px] text-[#2962ff] font-mono">
                <span>EMA 9</span>
                <button
                  type="button"
                  onClick={() => toggleIndicator("ema9")}
                  className="hover:text-white text-[#787b86]"
                  title="Remove EMA 9"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {indicators.ema21 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d]/80 backdrop-blur-xs border border-[#f59e0b]/40 text-[10px] text-[#f59e0b] font-mono">
                <span>EMA 21</span>
                <button
                  type="button"
                  onClick={() => toggleIndicator("ema21")}
                  className="hover:text-white text-[#787b86]"
                  title="Remove EMA 21"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {indicators.ema50 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d]/80 backdrop-blur-xs border border-[#ec4899]/40 text-[10px] text-[#ec4899] font-mono">
                <span>EMA 50</span>
                <button
                  type="button"
                  onClick={() => toggleIndicator("ema50")}
                  className="hover:text-white text-[#787b86]"
                  title="Remove EMA 50"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {indicators.ema200 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d]/80 backdrop-blur-xs border border-[#8b5cf6]/40 text-[10px] text-[#8b5cf6] font-mono">
                <span>EMA 200</span>
                <button
                  type="button"
                  onClick={() => toggleIndicator("ema200")}
                  className="hover:text-white text-[#787b86]"
                  title="Remove EMA 200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {indicators.bb && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d]/80 backdrop-blur-xs border border-[#38bdf8]/40 text-[10px] text-[#38bdf8] font-mono">
                <span>BB (20,2)</span>
                <button
                  type="button"
                  onClick={() => toggleIndicator("bb")}
                  className="hover:text-white text-[#787b86]"
                  title="Remove Bollinger Bands"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {indicators.rsi && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d]/80 backdrop-blur-xs border border-[#a855f7]/40 text-[10px] text-[#a855f7] font-mono">
                <span>RSI (14)</span>
                <button
                  type="button"
                  onClick={() => toggleIndicator("rsi")}
                  className="hover:text-white text-[#787b86]"
                  title="Remove RSI"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Bottom Range Bar (TradingView style 1D, 5D, 1M, 3M, 6M, 1Y, ALL + Scale Toggles) */}
          <footer className="h-7 border-t border-[#2a2e39] bg-[#131722] flex items-center justify-between px-3 text-[10px] text-[#787b86] flex-shrink-0">
            {/* Left: Date ranges */}
            <div className="flex items-center gap-1">
              {["1D", "5D", "1M", "3M", "6M", "1Y", "ALL"].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => handleSelectRange(r)}
                  className="px-2 py-0.5 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition-all font-semibold"
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Right: Scale Toggles & Timezone */}
            <div className="flex items-center gap-2 font-mono">
              <div className="flex items-center bg-[#1e222d] p-0.5 rounded border border-[#2a2e39]">
                <button
                  type="button"
                  onClick={() => setScaleMode(scaleMode === "percent" ? "normal" : "percent")}
                  className={`px-1.5 py-0.5 rounded transition-all font-bold ${
                    scaleMode === "percent"
                      ? "bg-[#2962ff] text-white"
                      : "text-[#787b86] hover:text-white"
                  }`}
                  title="Percentage Scale Mode"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode(scaleMode === "log" ? "normal" : "log")}
                  className={`px-1.5 py-0.5 rounded transition-all font-bold ${
                    scaleMode === "log"
                      ? "bg-[#2962ff] text-white"
                      : "text-[#787b86] hover:text-white"
                  }`}
                  title="Logarithmic Scale Mode"
                >
                  log
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode("normal")}
                  className={`px-1.5 py-0.5 rounded transition-all font-bold ${
                    scaleMode === "normal"
                      ? "bg-[#2962ff] text-white"
                      : "text-[#787b86] hover:text-white"
                  }`}
                  title="Normal Auto Scale Mode"
                >
                  auto
                </button>
              </div>

              <span className="hidden sm:inline text-[#787b86] pl-1 border-l border-[#2a2e39]">
                Binance (UTC+7)
              </span>
            </div>
          </footer>
        </div>

        {/* ========================================================= */}
        {/* 3. RIGHT WATCHLIST PANEL (Full TradingView Real-Time Look)*/}
        {/* ========================================================= */}
        {isWatchlistOpen && (
          <aside className="w-64 border-l border-[#2a2e39] bg-[#131722] flex flex-col justify-between flex-shrink-0 z-10 transition-all font-sans">
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header with Group Selector & Live WS Indicator */}
              <div className="flex flex-col border-b border-[#2a2e39] bg-[#181c27]">
                {/* Title & Actions */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e39]/50">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Bookmark className="w-3.5 h-3.5 text-[#2962ff]" />
                    <span>Watchlist</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isWatchlistWsConnected
                          ? "bg-[#089981]/15 text-[#089981]"
                          : "bg-[#787b86]/15 text-[#787b86]"
                      }`}
                      title={isWatchlistWsConnected ? "Live WebSocket Real-time Connected" : "Syncing Tickers..."}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isWatchlistWsConnected ? "bg-[#089981] animate-pulse" : "bg-[#787b86]"
                        }`}
                      />
                      {isWatchlistWsConnected ? "Live" : "Polling"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsNewGroupModalOpen((prev) => !prev)}
                      className="px-1.5 py-0.5 text-[10px] bg-[#2962ff]/20 text-[#2962ff] hover:bg-[#2962ff]/30 rounded font-medium flex items-center gap-0.5 transition-colors"
                      title="Add new watchlist group"
                    >
                      <Plus className="w-2.5 h-2.5" /> Group
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWatchlistOpen(false)}
                      className="p-1 text-[#787b86] hover:text-white rounded"
                      title="Close Watchlist"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Group Selector Dropdown */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#131722]/80">
                  <div className="flex items-center gap-1.5 w-full">
                    <Layers className="w-3 h-3 text-[#787b86] shrink-0" />
                    <select
                      value={activeWatchlistGroup}
                      onChange={(e) => handleSwitchGroup(e.target.value)}
                      className="h-6 w-full text-[11px] font-semibold bg-[#1e222d] border border-[#2a2e39] rounded px-1.5 text-white outline-none focus:border-[#2962ff] cursor-pointer"
                    >
                      {Object.keys(watchlistGroups).map((grp) => (
                        <option key={grp} value={grp} className="bg-[#1e222d] text-white">
                          {grp} ({watchlistGroups[grp]?.length || 0})
                        </option>
                      ))}
                    </select>
                    {Object.keys(watchlistGroups).length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGroup(activeWatchlistGroup, e)}
                        className="p-1 text-[#787b86] hover:text-[#f23645] rounded transition-colors"
                        title={`Delete group "${activeWatchlistGroup}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline New Group Input */}
                {isNewGroupModalOpen && (
                  <form onSubmit={handleCreateGroup} className="p-2 border-t border-[#2a2e39] bg-[#1c2130] flex gap-1">
                    <input
                      autoFocus
                      placeholder="Group name, e.g. DeFi, Top 10"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="h-6 text-[11px] w-full bg-[#131722] border border-[#2a2e39] rounded px-2 text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
                    />
                    <button
                      type="submit"
                      disabled={!newGroupName.trim()}
                      className="h-6 px-2 text-[10px] font-bold rounded bg-[#2962ff] hover:bg-[#2962ff]/80 text-white disabled:opacity-40"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewGroupModalOpen(false)}
                      className="h-6 px-1.5 text-[10px] rounded bg-[#2a2e39] hover:bg-[#2a2e39]/80 text-[#787b86] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                )}
              </div>

              {/* Add Symbol Input */}
              <div className="p-2 border-b border-[#2a2e39]">
                <form onSubmit={handleAddToWatchlist} className="flex items-center gap-1">
                  <input
                    placeholder="+ Add e.g. PEPE, ADA"
                    value={newWatchlistSymbol}
                    onChange={(e) => setNewWatchlistSymbol(e.target.value)}
                    className="h-7 w-full text-xs bg-[#1e222d] border border-[#2a2e39] rounded px-2 text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
                  />
                  <button
                    type="submit"
                    className="h-7 px-2.5 rounded bg-[#2962ff] hover:bg-[#2962ff]/80 text-white flex items-center justify-center"
                    title="Add symbol"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Table Column Headers */}
              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-[#787b86] border-b border-[#2a2e39] bg-[#131722]">
                <span>Symbol</span>
                <div className="flex items-center gap-4">
                  <span>Last</span>
                  <span>Chg%</span>
                </div>
              </div>

              {/* Watchlist Rows with Live Data */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39]/30">
                {watchlist.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#787b86]">
                    <Layers className="w-6 h-6 mx-auto mb-2 opacity-40 text-[#2962ff]" />
                    <p className="font-semibold text-white/70">กลุ่มนี้ยังไม่มีเหรียญ</p>
                    <p className="text-[11px] mt-1 text-[#787b86]">พิมพ์ชื่อเหรียญด้านบนแล้วกด + เพื่อเพิ่มลงกลุ่ม {activeWatchlistGroup}</p>
                  </div>
                ) : (
                  watchlist.map((sym) => {
                  const isActive = cleanSymbol === sym
                  const base = sym.replace(/USDT$|BUSD$|USDC$/, "")
                  const ticker = watchlistTickers[sym]
                  const symbolLines = Array.isArray(priceLines[sym]) ? priceLines[sym] : []
                  const savedLevelsCount = symbolLines.length
                  const isUp = ticker ? ticker.change >= 0 : true

                  return (
                    <div
                      key={sym}
                      onClick={() => setSymbol(sym)}
                      className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#2962ff]/15 text-white font-bold border-l-2 border-[#2962ff]"
                          : "text-[#d1d4dc] hover:bg-[#1e222d]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-xs tracking-wide">{base}</span>
                        {savedLevelsCount > 0 && (
                          <span className="text-[9px] px-1 rounded bg-[#2962ff]/20 text-[#2962ff] font-mono">
                            {savedLevelsCount}L
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ticker ? (
                          <div className="flex items-center gap-3 text-right font-mono text-[11px]">
                            <span className="text-white">
                              {ticker.price >= 1
                                ? ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : ticker.price.toFixed(4)}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                isUp ? "bg-[#089981]/15 text-[#089981]" : "bg-[#f23645]/15 text-[#f23645]"
                              }`}
                            >
                              {isUp ? "+" : ""}
                              {ticker.change.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#787b86]">--</span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromWatchlist(sym, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#787b86] hover:text-[#f23645] transition-opacity"
                          title="Remove from watchlist"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
              </div>

              {/* Bottom: TradingView Symbol Detail Card */}
              {selectedTickerDetail && (
                <div className="border-t border-[#2a2e39] bg-[#181c27] p-3 text-[11px] space-y-2">
                  <div className="flex items-center justify-between font-bold text-white text-xs">
                    <span>{cleanSymbol}</span>
                    <span className="text-[#787b86] font-normal">{assetName}</span>
                  </div>

                  {/* 24h High/Low Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-[#787b86] font-mono">
                      <span>L: ${selectedTickerDetail.low.toLocaleString()}</span>
                      <span>H: ${selectedTickerDetail.high.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#131722] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-[#f23645] via-[#f59e0b] to-[#089981]"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-[#787b86]">
                    <div>
                      <div className="text-[#787b86]">24h Vol</div>
                      <div className="text-white font-semibold">
                        {selectedTickerDetail.volume >= 1000000
                          ? `${(selectedTickerDetail.volume / 1000000).toFixed(2)}M`
                          : selectedTickerDetail.volume >= 1000
                          ? `${(selectedTickerDetail.volume / 1000).toFixed(2)}K`
                          : selectedTickerDetail.volume.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#787b86]">24h Quote</div>
                      <div className="text-white font-semibold">
                        ${(selectedTickerDetail.quoteVolume / 1000000).toFixed(2)}M
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. MODALS (Inline overlays, fully functional in Fullscreen)*/}
      {/* ========================================================= */}

      {/* Price Alerts Modal (Email Notification) */}
      {isAlertsOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#1e222d] border border-[#2a2e39] p-5 shadow-2xl text-white space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm font-bold">แจ้งเตือนราคา (Price Alerts)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] font-mono font-bold">
                  Email
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertsOpen(false)}
                className="text-[#787b86] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39] text-xs">
              <button
                type="button"
                onClick={() => setAlertTab("create")}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  alertTab === "create"
                    ? "bg-[#2962ff] text-white shadow"
                    : "text-[#787b86] hover:text-white"
                }`}
              >
                + ตั้งแจ้งเตือนใหม่
              </button>
              <button
                type="button"
                onClick={() => setAlertTab("active")}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  alertTab === "active"
                    ? "bg-[#2962ff] text-white shadow"
                    : "text-[#787b86] hover:text-white"
                }`}
              >
                เปิดใช้งาน ({activeAlertsCount})
              </button>
              <button
                type="button"
                onClick={() => setAlertTab("history")}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  alertTab === "history"
                    ? "bg-[#2962ff] text-white shadow"
                    : "text-[#787b86] hover:text-white"
                }`}
              >
                ประวัติ ({historyAlerts.length})
              </button>
            </div>

            {/* Tab 1: Create Alert Form */}
            {alertTab === "create" && (
              <form onSubmit={handleCreateAlert} className="space-y-3.5 bg-[#131722] p-4 rounded-xl border border-[#2a2e39]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#787b86] mb-1">
                      เหรียญ (Symbol)
                    </label>
                    <input
                      required
                      value={alertSymbol}
                      onChange={(e) => setAlertSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g. BTCUSDT"
                      className="w-full h-8 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 text-xs text-white uppercase outline-none focus:border-[#2962ff]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#787b86] mb-1">
                      ราคาเป้าหมาย ($)
                    </label>
                    <input
                      required
                      type="number"
                      step="any"
                      value={alertTargetPrice}
                      onChange={(e) => setAlertTargetPrice(e.target.value)}
                      placeholder="e.g. 95000"
                      className="w-full h-8 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 text-xs text-white font-mono outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </div>

                {/* Condition Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#787b86] mb-1">
                    เงื่อนไขแจ้งเตือน (Condition)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAlertCondition("crosses_above")}
                      className={`py-1.5 px-3 rounded text-xs text-left font-semibold border transition-all ${
                        alertCondition === "crosses_above"
                          ? "border-[#089981] bg-[#089981]/15 text-[#089981]"
                          : "border-[#2a2e39] bg-[#1e222d] text-[#787b86] hover:text-white"
                      }`}
                    >
                      📈 พุ่งแตะระดับบน (&ge; เป้าหมาย)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertCondition("crosses_below")}
                      className={`py-1.5 px-3 rounded text-xs text-left font-semibold border transition-all ${
                        alertCondition === "crosses_below"
                          ? "border-[#f23645] bg-[#f23645]/15 text-[#f23645]"
                          : "border-[#2a2e39] bg-[#1e222d] text-[#787b86] hover:text-white"
                      }`}
                    >
                      📉 ร่วงแตะระดับล่าง (&le; เป้าหมาย)
                    </button>
                  </div>
                </div>

                {/* Destination Email */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#787b86] mb-1">
                    อีเมลปลายทางสำหรับรับแจ้งเตือน (Email Address)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="w-3.5 h-3.5 text-[#787b86] absolute left-2.5 top-2.5" />
                      <input
                        required
                        type="email"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="w-full h-8 bg-[#1e222d] border border-[#2a2e39] rounded pl-8 pr-2.5 text-xs text-white outline-none focus:border-[#2962ff]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="px-3 h-8 rounded bg-[#2a2e39] hover:bg-[#363a45] text-xs font-semibold text-[#d1d4dc] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Send test alert email to this address"
                    >
                      {isTestingEmail ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#2962ff]" />
                      ) : (
                        <Send className="w-3 h-3 text-[#2962ff]" />
                      )}
                      <span>ทดสอบส่ง</span>
                    </button>
                  </div>
                  {testEmailFeedback && (
                    <div className="text-[11px] mt-1.5 text-amber-400 font-medium animate-in fade-in">
                      {testEmailFeedback}
                    </div>
                  )}
                </div>

                {/* Note Label */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#787b86] mb-1">
                    บันทึกช่วยจำ (Optional Note)
                  </label>
                  <input
                    value={alertNote}
                    onChange={(e) => setAlertNote(e.target.value)}
                    placeholder="e.g. TP 1 ขาย 50%, จุด Stop loss, ทะลุแนวต้าน 90K"
                    className="w-full h-8 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 text-xs text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingAlert}
                    className="px-5 py-2 rounded bg-[#2962ff] hover:bg-[#2962ff]/80 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                  >
                    {isSubmittingAlert ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BellRing className="w-3.5 h-3.5" />
                    )}
                    <span>บันทึกการแจ้งเตือน</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Active Alerts List */}
            {alertTab === "active" && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeAlerts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#787b86] space-y-2">
                    <BellOff className="w-6 h-6 mx-auto text-[#787b86]/50" />
                    <div>ไม่มีรายการแจ้งเตือนที่เปิดใช้งานอยู่</div>
                    <button
                      type="button"
                      onClick={() => setAlertTab("create")}
                      className="text-xs text-[#2962ff] hover:underline font-semibold"
                    >
                      + ตั้งแจ้งเตือนราคาแรกของคุณ
                    </button>
                  </div>
                ) : (
                  activeAlerts.map((a) => {
                    const isUp = a.condition.includes("above") || a.condition === "greater_than"
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#131722] border border-[#2a2e39] text-xs hover:border-[#2a2e39]/80 transition-all"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-white text-xs">{a.symbol}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                isUp ? "bg-[#089981]/15 text-[#089981]" : "bg-[#f23645]/15 text-[#f23645]"
                              }`}
                            >
                              {isUp ? "≥" : "≤"} ${a.target_price.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#787b86]">
                            <Mail className="w-3 h-3" />
                            <span>{a.email}</span>
                            {a.note && <span className="text-zinc-400">({a.note})</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAlert(a.id, a.status)}
                            className="px-2 py-1 rounded bg-[#2a2e39] hover:bg-[#363a45] text-[10px] font-semibold text-[#d1d4dc] transition-colors"
                            title="Pause Alert"
                          >
                            พัก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAlert(a.id)}
                            className="p-1 text-[#787b86] hover:text-[#f23645] transition-colors"
                            title="Delete Alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Tab 3: History */}
            {alertTab === "history" && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {historyAlerts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#787b86]">
                    ยังไม่มีประวัติการแจ้งเตือนที่ทำงานแล้ว
                  </div>
                ) : (
                  historyAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#131722] border border-[#2a2e39] text-xs opacity-80"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-mono">
                          <Check className="w-3.5 h-3.5 text-[#089981]" />
                          <span className="font-bold text-white text-xs">{a.symbol}</span>
                          <span className="text-[10px] text-zinc-400">
                            เป้า ${a.target_price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#787b86]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {a.triggered_at
                              ? new Date(a.triggered_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
                              : "Recently"}
                          </span>
                          <span>&middot; ส่งไปที่ {a.email}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(a.id)}
                        className="p-1 text-[#787b86] hover:text-[#f23645] transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-[#2a2e39] text-[11px] text-[#787b86]">
              <span>ระบบตรวจสอบราคาอัตโนมัติ 24/7 ผ่าน Binance Public Stream</span>
              <button
                type="button"
                onClick={() => setIsAlertsOpen(false)}
                className="px-4 py-1.5 rounded bg-[#2962ff] text-white text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symbol Search Modal */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-[#1e222d] border border-[#2a2e39] p-4 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <span className="text-sm font-bold">Search Binance Symbol</span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[#787b86] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                autoFocus
                placeholder="Type e.g. BTC, ETH, SOL, PEPE, LINK"
                value={searchSymbolInput}
                onChange={(e) => setSearchSymbolInput(e.target.value)}
                className="flex-1 h-9 bg-[#131722] border border-[#2a2e39] rounded px-3 text-sm text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
              />
              <button
                type="submit"
                className="px-4 h-9 bg-[#2962ff] hover:bg-[#2962ff]/80 text-white text-xs font-bold rounded"
              >
                Switch
              </button>
            </form>

            <div>
              <div className="text-[11px] font-semibold text-[#787b86] mb-2">Popular Pairs</div>
              <div className="flex flex-wrap gap-1.5">
                {["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "AVAX", "SUI", "PAXG", "ADA", "PEPE", "LINK", "NEAR"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSymbol(`${s}USDT`)
                      setIsSearchOpen(false)
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-[#d1d4dc] hover:text-white transition-all font-semibold"
                  >
                    {s}USDT
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* fx Indicators Management Modal */}
      {isIndicatorsOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#1e222d] border border-[#2a2e39] p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-serif italic font-bold text-base text-[#2962ff]">fx</span>
                <span className="text-sm font-bold">Indicators & Studies</span>
              </div>
              <button
                type="button"
                onClick={() => setIsIndicatorsOpen(false)}
                className="text-[#787b86] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {[
                { key: "ema9", label: "EMA 9", desc: "Exponential Moving Average (Fast Trend)", color: "#2962ff" },
                { key: "ema21", label: "EMA 21", desc: "Exponential Moving Average (Pullback Level)", color: "#f59e0b" },
                { key: "ema50", label: "EMA 50", desc: "Exponential Moving Average (Medium Trend)", color: "#ec4899" },
                { key: "ema200", label: "EMA 200", desc: "Exponential Moving Average (Major Trend)", color: "#8b5cf6" },
                { key: "sma20", label: "SMA 20", desc: "Simple Moving Average (Basis)", color: "#eab308" },
                { key: "bb", label: "Bollinger Bands (20, 2)", desc: "Volatility & Dynamic Support/Resistance Bands", color: "#38bdf8" },
                { key: "rsi", label: "RSI (14)", desc: "Relative Strength Index (Dedicated Lower Pane with 70/30)", color: "#a855f7" },
                { key: "volume", label: "Volume (Histogram)", desc: "Trading Volume with Color Coding", color: "#089981" },
              ].map((ind) => {
                const isActive = indicators[ind.key as keyof typeof indicators]
                return (
                  <div
                    key={ind.key}
                    onClick={() => toggleIndicator(ind.key as keyof typeof indicators)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#131722] hover:bg-[#2a2e39]/50 border border-[#2a2e39] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ind.color }} />
                      <div>
                        <div className="text-xs font-bold text-white">{ind.label}</div>
                        <div className="text-[11px] text-[#787b86]">{ind.desc}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        isActive ? "bg-[#2962ff] text-white shadow" : "bg-[#2a2e39] text-[#787b86]"
                      }`}
                    >
                      {isActive ? "Active" : "Add"}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#2a2e39]">
              <button
                type="button"
                onClick={() => setIsIndicatorsOpen(false)}
                className="px-4 py-1.5 rounded bg-[#2962ff] text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support & Resistance Levels Modal */}
      {isLevelsOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-[#1e222d] border border-[#2a2e39] p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
              <div>
                <span className="text-sm font-bold">{cleanSymbol} Key Price Levels</span>
                <span className="block text-[11px] text-[#787b86]">Support, Resistance & Price Targets</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLevelsOpen(false)}
                className="text-[#787b86] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Level Form */}
            <form onSubmit={handleAddPriceLine} className="space-y-3 bg-[#131722] p-3 rounded-lg border border-[#2a2e39]">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Price (e.g. 80500)"
                  value={newLevelPrice}
                  onChange={(e) => setNewLevelPrice(e.target.value)}
                  className="flex-1 h-8 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 text-xs text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
                />
                <button
                  type="submit"
                  className="px-3 h-8 bg-[#2962ff] hover:bg-[#2962ff]/80 text-white text-xs font-bold rounded"
                >
                  + Add Line
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  placeholder="Title (e.g. Major Support, Target 1)"
                  value={newLevelTitle}
                  onChange={(e) => setNewLevelTitle(e.target.value)}
                  className="flex-1 h-8 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 text-xs text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
                />
                <div className="flex items-center gap-1.5 pl-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewLevelColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newLevelColor === c.value ? "scale-125 ring-2 ring-white" : "opacity-60 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </form>

            {/* Levels List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {currentSymbolLines.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#787b86]">
                  No custom levels saved yet for {cleanSymbol}.
                </div>
              ) : (
                currentSymbolLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between px-3 py-2 rounded bg-[#131722] border border-[#2a2e39] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.color || "#2962ff" }} />
                      <span className="font-mono font-bold text-white text-xs">${line.price.toLocaleString()}</span>
                      {typeof line.title === "string" && line.title ? (
                        <span className="text-[11px] text-[#787b86]">({line.title})</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Quick 1-click Set Email Alert for this level */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLevelsOpen(false)
                          handleOpenAlertCreator(line.price, line.title)
                        }}
                        className="p-1 text-[#787b86] hover:text-[#f59e0b] transition-colors"
                        title={`Set Email Alert at $${line.price}`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePriceLine(line.id)}
                        className="p-1 text-[#787b86] hover:text-[#f23645] transition-colors"
                        title="Delete Level"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#2a2e39]">
              {currentSymbolLines.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAllSymbolLines}
                  className="text-xs text-[#f23645] hover:underline"
                >
                  Clear all for {cleanSymbol}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsLevelsOpen(false)}
                className="px-4 py-1.5 rounded bg-[#2962ff] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InteractiveTradingChart
