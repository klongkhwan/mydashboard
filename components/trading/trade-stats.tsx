import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoading } from "@/components/ui/loading"
import { ModernPageLoading } from "@/components/ui/modern-loader"
import { DollarSign, Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, Calendar, Brain } from "lucide-react"
import { Trade, Market, EmotionType, TradeStatistics } from "@/types/trading"
import { calculateTradeStatistics } from "@/lib/trading"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { format, subDays, startOfYear, isAfter } from "date-fns"
import { th } from "date-fns/locale"

interface TradeStatsProps {
  refreshTrigger?: number
}

const COLORS = {
  profit: "#39FF14",
  loss: "#ef4444",
  neutral: "#8C8C8C",
  grid: "#262826",
  text: "#8C8C8C",
}

export function TradeStats({ refreshTrigger = 0 }: TradeStatsProps) {
  const [stats, setStats] = useState<TradeStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | '1y' | 'ytd' | '3m' | '1m' | '7d'>('all')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await calculateTradeStatistics()
        setStats(data)
      } catch (error) {
        console.error("Failed to fetch trades stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refreshTrigger])

  if (loading) {
    return <ModernPageLoading />
  }

  if (!stats || (stats.total_trades === 0 && stats.open_trades === 0)) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground bg-card/50">
        <Activity className="h-10 w-10 mb-3 opacity-20" />
        <p>เพิ่มข้อมูลการเทรดเพื่อดูสถิติ</p>
      </div>
    )
  }

  const {
    netPnL,
    winRate,
    largestWin,
    largestLoss,
    marketPerformance,
    domEntry,
    domExit,
    equityCurveData,
    barData,
    avgWinHold,
    avgLossHold,
    maxDrawdown,
    openTradesCount,
    closedTradesCount,
    winningTradesCount,
    losingTradesCount,
    profitFactor,
    openTradesList
  } = {
    netPnL: stats.total_profit_loss,
    winRate: stats.win_rate,
    largestWin: stats.largest_win,
    largestLoss: stats.largest_loss,
    marketPerformance: stats.market_performance,
    domEntry: stats.dominant_emotions.entry,
    domExit: stats.dominant_emotions.exit,
    equityCurveData: stats.equity_curve,
    barData: stats.monthly_pnl,
    avgWinHold: stats.avg_hold_time_win,
    avgLossHold: stats.avg_hold_time_loss,
    maxDrawdown: stats.max_drawdown,
    openTradesCount: stats.open_trades,
    closedTradesCount: stats.closed_trades,
    winningTradesCount: stats.winning_trades,
    losingTradesCount: stats.losing_trades,
    profitFactor: stats.profit_factor,
    openTradesList: stats.open_trades_list || []
  }


  // Client-side Chart Filtering (Still needed for interactivity without re-fetching)
  const getFilteredChartData = () => {
    const now = new Date()
    let startDate: Date | null = null

    switch (timeRange) {
      case '7d': startDate = subDays(now, 7); break;
      case '1m': startDate = subDays(now, 30); break;
      case '3m': startDate = subDays(now, 90); break;
      case 'ytd': startDate = startOfYear(now); break;
      case '1y': startDate = subDays(now, 365); break;
      case 'all': default: startDate = null; break;
    }

    const filtered = startDate
      ? equityCurveData.filter(d => isAfter(d.entry_date, startDate!))
      : equityCurveData

    // Recalculate pnl for chart relative to start of period? 
    // Usually equity curves show absolute growth. Slicing absolute growth is fine.
    return filtered
  }

  const chartData = getFilteredChartData()

  const formatDuration = (ms: number) => {
    if (ms === 0) return "-"
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pnlData = payload[0].payload
      return (
        <div className="bg-[#0D0F0D] border border-[#262826] rounded-lg p-3 shadow-xl text-xs">
          <p className="text-muted-foreground mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Equity:</span>
              <span className="font-bold text-[#39FF14]">{formatCurrency(pnlData.pnl)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Change:</span>
              <span className={`font-bold ${pnlData.rawPnl >= 0 ? "text-[#39FF14]" : "text-red-500"}`}>
                {pnlData.rawPnl > 0 ? "+" : ""}{formatCurrency(pnlData.rawPnl)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">

      {/* 1. KEY METRICS ROW (4 Columns) - Normal Height/Scale */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-shrink-0">
        {/* Net P&L */}
        <Card className="bg-card/50 border-none shadow-sm relative overflow-hidden">
          <CardContent className="p-3 flex flex-col h-full">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Net P&L</span>
            <div className="flex-1 flex items-center">
              <div className={`text-2xl font-bold ${netPnL >= 0 ? "text-[#39FF14]" : "text-red-500"}`}>
                {formatCurrency(netPnL)}
              </div>
            </div>
            <div className="absolute right-2 top-2 opacity-10">
              <DollarSign className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-card/50 border-none shadow-sm">
          <CardContent className="p-2 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Rate</span>
              <div className="flex gap-2 text-[10px] text-muted-foreground hidden">
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className={`text-2xl font-bold ${winRate >= 50 ? "text-[#39FF14]" : "text-yellow-500"}`}>
                {winRate.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">({winningTradesCount}W/{losingTradesCount}L) Total {closedTradesCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Trade Extremes */}
        <Card className="bg-card/50 border-none shadow-sm">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Extremes</span>
            <div className="grid grid-cols-2 gap-x-4 text-xs">
              <div className="text-muted-foreground">Best</div>
              <div className="text-right text-[#39FF14] font-bold">{formatCurrency(largestWin)}</div>
              <div className="text-muted-foreground">Worst</div>
              <div className="text-right text-red-500 font-bold">{formatCurrency(largestLoss)}</div>
            </div>
            <div className="flex justify-between items-center text-[10px] bg-secondary/20 rounded px-2 py-1 mt-2">
              <span className="text-muted-foreground">Profit Factor</span>
              <span className={`font-bold ${profitFactor >= 1.5 ? "text-[#39FF14]" : "text-foreground"}`}>{profitFactor.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Positions (Position 4) */}
        <Card className="bg-card/50 border-none shadow-sm relative overflow-hidden">
          <CardContent className="p-3 flex flex-col h-full">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Active Positions</span>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-1.5 min-h-[60px]">
              {openTradesList && openTradesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <Activity className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">No active positions</span>
                </div>
              ) : (
                openTradesList.map(t => (
                  <div key={t.id} className="flex justify-between items-center text-xs bg-secondary/20 hover:bg-secondary/30 transition-colors p-1.5 rounded">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.market === 'spot' ? 'bg-green-500' : t.market === 'futures' ? 'bg-orange-500' : 'bg-purple-500'}`}></span>
                      <span className="font-medium truncate max-w-[60px]">{t.symbol}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`h-4 px-1 py-0 text-[9px] border-0 ${t.direction === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {t.direction === 'buy' ? 'L' : 'S'}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {t.market === 'spot' ? 'Spot' : `${t.leverage}x`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trading Habits */}
        <Card className="bg-card/50 border-none shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center h-full gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Avg Hold Time</span>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Win</span>
                <span className="font-mono text-[#39FF14]">{formatDuration(avgWinHold)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Loss</span>
                <span className="font-mono text-red-500">{formatDuration(avgLossHold)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* 2. MAIN CONTENT ROW (Fixed Height to fit screen) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[56vh]">

        {/* LEFT: EQUITY CURVE */}
        <Card className="md:col-span-9 bg-card border-none shadow-md flex flex-col h-full">
          <CardHeader className="py-2 px-4 border-b border-border/10 flex flex-row items-center justify-between flex-shrink-0 min-h-[48px]">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#39FF14]" /> Equity Growth
            </CardTitle>
            <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
              {(['7d', '1m', '3m', 'ytd', '1y', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${timeRange === range
                    ? 'bg-[#39FF14] text-black font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#39FF14" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#39FF14" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262826" vertical={false} />
                <XAxis dataKey="date" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pnl" stroke="#39FF14" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RIGHT: INSIGHTS STACK */}
        <div className="md:col-span-3 flex flex-col gap-3 h-full min-h-0">

          {/* Market Performance & Emotions Grid (Side by side) */}
          <div className="grid grid-cols-2 gap-3 h-[120px] flex-shrink-0">
            {/* Market Performance */}
            <Card className="bg-card border-none shadow-md overflow-hidden relative">
              <CardContent className="p-2.5 flex flex-col justify-center gap-2">
                <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Market P&L</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(marketPerformance).map(([market, data]) => (
                    <div key={market} className="flex justify-between items-center text-[10px]">
                      <span className={`capitalize ${data.trades > 0 ? "text-foreground" : "text-muted-foreground"}`}>{market}</span>
                      <span className={`font-mono ${data.profit_loss > 0 ? "text-[#39FF14]" : data.profit_loss < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {data.profit_loss !== 0 ? formatCurrency(data.profit_loss) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emotion Analysis */}
            <Card className="bg-card border-none shadow-md overflow-hidden">
              <CardContent className="p-2.5 flex flex-col justify-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Dominant Mood</span>
                <div className="flex justify-between items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground">Entry</span>
                    <span className={`text-xs font-bold capitalize ${domEntry.emotion !== '-' ? 'text-[#39FF14]' : 'text-muted-foreground'}`}>{domEntry.emotion}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-border/20"></div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-muted-foreground">Exit</span>
                    <span className={`text-xs font-bold capitalize ${domExit.emotion !== '-' ? 'text-red-500' : 'text-muted-foreground'}`}>{domExit.emotion}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly P&L (Redesigned) */}
          <Card className="bg-card border-none shadow-md flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3 flex-shrink-0 min-h-[40px]">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Monthly Performance</CardTitle>
                {/* Year Total Widget */}
                <div className="text-[10px] font-mono">
                  <span className="text-muted-foreground mr-1">YTD:</span>
                  <span className={`${stats?.total_profit_loss >= 0 ? "text-[#39FF14]" : "text-red-500"}`}>
                    {formatCurrency(stats?.total_profit_loss || 0)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262826" vertical={false} />
                  <XAxis dataKey="name" stroke="#525252" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} width={25} />
                  <Tooltip
                    cursor={{ fill: 'transparent', stroke: '#525252', strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", fontSize: "10px", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                    itemStyle={{ color: "#ffffff" }}
                    labelStyle={{ color: "#a1a1aa", marginBottom: "2px" }}
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), "P&L"]}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#39FF14" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}