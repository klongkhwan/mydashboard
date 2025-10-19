"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Award, Brain, Heart } from "lucide-react"
import { Trade, Market, EmotionType } from "@/types/trading"

interface TradeStatsProps {
  trades: Trade[]
}

export function TradeStats({ trades }: TradeStatsProps) {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.profit_loss !== null)

  if (closedTrades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>สถิติการเทรด</CardTitle>
          <CardDescription>ยังไม่มีข้อมูลสถิติ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>เริ่มบันทึกการเทรดและปิดออเดอร์เพื่อดูสถิติ</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const winningTrades = closedTrades.filter(trade => (trade.profit_loss || 0) > 0)
  const losingTrades = closedTrades.filter(trade => (trade.profit_loss || 0) < 0)

  const totalProfit = winningTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0))
  const totalProfitLoss = closedTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

  const winRate = (winningTrades.length / closedTrades.length) * 100
  const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0
  const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0

  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
  const expectancy = closedTrades.length > 0 ? totalProfitLoss / closedTrades.length : 0

  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit_loss || 0)) : 0
  const largestLoss = losingTrades.length > 0 ? Math.abs(Math.min(...losingTrades.map(t => t.profit_loss || 0))) : 0

  // Calculate max drawdown
  let maxDrawdown = 0
  let peak = 0
  let cumulative = 0

  closedTrades.forEach(trade => {
    cumulative += trade.profit_loss || 0
    if (cumulative > peak) {
      peak = cumulative
    }
    const drawdown = peak - cumulative
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  })

  // Market performance
  const marketPerformance = trades.reduce((acc, trade) => {
    if (trade.profit_loss !== null && trade.status === 'closed') {
      if (!acc[trade.market]) {
        acc[trade.market] = { profit: 0, count: 0 }
      }
      acc[trade.market].profit += trade.profit_loss || 0
      acc[trade.market].count += 1
    }
    return acc
  }, {} as Record<Market, { profit: number; count: number }>)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return "text-green-600"
    if (rate >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-600"
    if (profit < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getEmotionLabel = (emotion: EmotionType) => {
    const emotionConfig = {
      greedy: "โลภ",
      fearful: "กลัว",
      confident: "มั่นใจ",
      anxious: "กังวล",
      neutral: "เป็นกลาง",
      excited: "ตื่นเต้น",
      disappointed: "ผิดหวัง",
      calm: "สงบ"
    }
    return emotionConfig[emotion] || emotion
  }

  return (
    <div className="space-y-4">
      {/* Main Statistics - More Compact */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total P&L</p>
              <p className={`text-lg font-bold ${getProfitColor(totalProfitLoss)}`}>
                {formatCurrency(totalProfitLoss)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {closedTrades.length} trades
              </p>
            </div>
            <DollarSign className={`h-4 w-4 ${totalProfitLoss >= 0 ? "text-green-600" : "text-red-600"}`} />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Win Rate</p>
              <p className={`text-lg font-bold ${getWinRateColor(winRate)}`}>
                {formatPercent(winRate)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {winningTrades.length}W / {losingTrades.length}L
              </p>
            </div>
            <Target className={`h-4 w-4 ${getWinRateColor(winRate)}`} />
          </div>
          <Progress value={winRate} className="mt-2 h-1" />
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Profit Factor</p>
              <p className="text-lg font-bold">
                {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totalProfit)} / {formatCurrency(totalLoss)}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Max DD</p>
              <p className={`text-lg font-bold ${maxDrawdown > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(maxDrawdown)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Drawdown
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Performance Summary - Combined Layout */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Key Metrics */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            ประสิทธิภาพหลัก
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Avg Win</p>
              <p className={`font-semibold ${getProfitColor(averageWin)}`}>
                {formatCurrency(averageWin)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Loss</p>
              <p className={`font-semibold ${getProfitColor(-averageLoss)}`}>
                {formatCurrency(averageLoss)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expectancy</p>
              <p className={`font-semibold ${getProfitColor(expectancy)}`}>
                {formatCurrency(expectancy)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Trades</p>
              <p className="font-semibold">{closedTrades.length}</p>
            </div>
          </div>
        </Card>

        {/* Best/Worst Trades */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            การเทรดที่โดดเด่น
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best Trade</span>
              <span className={`font-semibold ${getProfitColor(largestWin)}`}>
                +{formatCurrency(largestWin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Worst Trade</span>
              <span className={`font-semibold ${getProfitColor(-largestLoss)}`}>
                -{formatCurrency(largestLoss)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Winning Trades</span>
              <span className="font-semibold text-green-600">{winningTrades.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Losing Trades</span>
              <span className="font-semibold text-red-600">{losingTrades.length}</span>
            </div>
          </div>
        </Card>

        {/* Market Performance */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            ผลตอบแทนตามตลาด
          </h4>
          <div className="space-y-2">
            {Object.entries(marketPerformance).map(([market, data]) => (
              <div key={market} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={market === 'spot' ? 'default' : market === 'futures' ? 'secondary' : 'outline'}
                    className="capitalize text-xs"
                  >
                    {market === 'spot' ? 'Spot' : market === 'futures' ? 'Futures' : 'Margin'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({data.count} trades)
                  </span>
                </div>
                <span className={`text-sm font-semibold ${getProfitColor(data.profit)}`}>
                  {formatCurrency(data.profit)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Emotion Analysis */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            วิเคราะห์อารมณ์
          </h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">อารมณ์เข้าเทรด</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(
                  trades.filter(t => t.entry_emotion).reduce((acc, trade) => {
                    if (trade.entry_emotion) {
                      acc[trade.entry_emotion] = (acc[trade.entry_emotion] || 0) + 1
                    }
                    return acc
                  }, {} as Record<string, number>)
                ).map(([emotion, count]) => (
                  <Badge key={emotion} variant="outline" className="text-xs">
                    {getEmotionLabel(emotion as EmotionType)} ({count})
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">อารมณ์ปิดออเดอร์</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(
                  trades.filter(t => t.exit_emotion).reduce((acc, trade) => {
                    if (trade.exit_emotion) {
                      acc[trade.exit_emotion] = (acc[trade.exit_emotion] || 0) + 1
                    }
                    return acc
                  }, {} as Record<string, number>)
                ).map(([emotion, count]) => (
                  <Badge key={emotion} variant="outline" className="text-xs">
                    {getEmotionLabel(emotion as EmotionType)} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}