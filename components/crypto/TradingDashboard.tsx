"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Activity, TrendingUp, TrendingDown, DollarSign, RefreshCw, Users, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useBinanceData } from "@/hooks/useBinanceData"
import { OpenInterestChart } from "@/components/charts/OpenInterestChart"
import { LongShortAccountsChart } from "@/components/charts/LongShortAccountsChart"
import { LongShortPositionsChart } from "@/components/charts/LongShortPositionsChart"
import { LongShortRatioChart } from "@/components/charts/LongShortRatioChart"
import { TakerVolumeChart } from "@/components/charts/TakerVolumeChart"
import { BasisChart } from "@/components/charts/BasisChart"
import { TradingDataPoint } from "@/types/crypto"

export function TradingDashboard() {
  const [symbol, setSymbol] = useState("DOGEUSDC")
  const [period, setPeriod] = useState("5")
  const { data, isLoading, apiError, refetch } = useBinanceData(symbol, period)

  const currentData = data[data.length - 1] || {
    openInterest: 0,
    notionalValue: 0,
    longShortAccounts: 0,
    longShortPositions: 0,
    longShortRatio: 0,
    takerBuy: 0,
    takerSell: 0,
    futuresPrice: 0,
    priceIndex: 0,
    basis: 0,
    longAccount: 0,
    shortAccount: 0,
  }

  // Calculate additional stats
  const totalVolume = currentData.takerBuy + currentData.takerSell
  const buySellRatio = currentData.takerSell > 0 ? (currentData.takerBuy / currentData.takerSell).toFixed(2) : "0"
  const priceChange = data.length > 1 ? ((currentData.futuresPrice - data[data.length - 2].futuresPrice) / data[data.length - 2].futuresPrice * 100).toFixed(2) : "0"

  // Calculate long/short percentages from ratios
  const accountLongPct = currentData.longShortAccounts > 0 ? (100 * currentData.longShortAccounts / (1 + currentData.longShortAccounts)).toFixed(2) : "50.00"
  const accountShortPct = currentData.longShortAccounts > 0 ? (100 / (1 + currentData.longShortAccounts)).toFixed(2) : "50.00"

  const positionLongPct = currentData.longShortPositions > 0 ? (100 * currentData.longShortPositions / (1 + currentData.longShortPositions)).toFixed(2) : "50.00"
  const positionShortPct = currentData.longShortPositions > 0 ? (100 / (1 + currentData.longShortPositions)).toFixed(2) : "50.00"

  const globalLongPct = currentData.longShortRatio > 0 ? (100 * currentData.longShortRatio / (1 + currentData.longShortRatio)).toFixed(2) : "50.00"
  const globalShortPct = currentData.longShortRatio > 0 ? (100 / (1 + currentData.longShortRatio)).toFixed(2) : "50.00"

  const stats = [
    {
      title: "Interest & Value",
      value: `$${(currentData.openInterest / 1000000).toFixed(3)} M`,
      icon: BarChart3,
      color: "text-blue-600",
      details: [
        { label: "Open Interest", value: `$${(currentData.openInterest / 1000000).toFixed(3)} M`, color: "text-blue-600" },
        { label: "Notional Value", value: `$${(currentData.notionalValue / 1000000).toFixed(3)} M`, color: "text-green-600" }
      ]
    },
    {
      title: "Buy Volume",
      value: `$${(currentData.takerBuy / 1000000).toFixed(3)} M`,
      icon: ArrowUpRight,
      color: "text-teal-600",
    },
    {
      title: "Sell Volume",
      value: `$${(currentData.takerSell / 1000000).toFixed(3)} M`,
      icon: ArrowDownRight,
      color: "text-orange-600",
    },
    {
      title: "Total Accounts",
      value: currentData.longShortAccounts.toFixed(2),
      icon: Users,
      color: "text-indigo-600",
      details: [
        { label: "Long", value: `${accountLongPct}%`, color: "text-emerald-600" },
        { label: "Short", value: `${accountShortPct}%`, color: "text-rose-600" }
      ]
    },
    {
      title: "Total Position",
      value: currentData.longShortPositions.toFixed(2),
      icon: TrendingUp,
      color: "text-cyan-600",
      details: [
        { label: "Long", value: `${positionLongPct}%`, color: "text-emerald-600" },
        { label: "Short", value: `${positionShortPct}%`, color: "text-rose-600" }
      ]
    },
    {
      title: "Total Global",
      value: currentData.longShortRatio.toFixed(2),
      icon: Activity,
      color: "text-purple-600",
      details: [
        { label: "Long", value: `${globalLongPct}%`, color: "text-emerald-600" },
        { label: "Short", value: `${globalShortPct}%`, color: "text-rose-600" }
      ]
    },
    
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Trading Dashboard</h1>
        <p className="text-muted-foreground mt-2">Real-time market analysis and trading insights</p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Market Controls
          </CardTitle>
          <CardDescription>
            Configure symbol and timeframe for market analysis
            {apiError && " (Using demo data - API unavailable)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">Symbol</label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOGEUSDC">DOGE/USDC</SelectItem>
                  <SelectItem value="BTCUSDC">BTC/USDC</SelectItem>
                  <SelectItem value="ETHUSDC">ETH/USDC</SelectItem>
                  <SelectItem value="BNBUSDC">BNB/USDC</SelectItem>
                  <SelectItem value="SOLUSDC">SOL/USDC</SelectItem>
                  <SelectItem value="XRPUSDC">XRP/USDC</SelectItem>
                  <SelectItem value="AVAXUSDC">AVAX/USDC</SelectItem>
                  <SelectItem value="SUIUSDC">SUI/USDC</SelectItem>
                  <SelectItem value="HBARUSDC">HBAR/USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">Timeframe</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Minutes</SelectItem>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="240">4 Hour</SelectItem>
                  <SelectItem value="1440">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={refetch} disabled={isLoading} className="flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    {/* <p className="text-sm text-primary mt-1">{stat.change}</p> */}
                    {stat.details && (
                      <div className="flex gap-3 mt-2">
                        {stat.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{detail.label}:</span>
                            <span className={`text-xs font-medium ${detail.color}`}>{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Open Interest Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Open Interest
          </CardTitle>
          <CardDescription>Total open interest over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <OpenInterestChart data={data} period={period} />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Long Short Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Long/Short Accounts Ratio
            </CardTitle>
            <CardDescription>Ratio of long vs short accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <LongShortAccountsChart data={data} period={period} />
          </CardContent>
        </Card>

        {/* Long Short Positions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Long/Short Positions Ratio
            </CardTitle>
            <CardDescription>Ratio of long vs short positions</CardDescription>
          </CardHeader>
          <CardContent>
            <LongShortPositionsChart data={data} period={period} />
          </CardContent>
        </Card>

        {/* Global Long Short Ratio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Global Long/Short Ratio
            </CardTitle>
            <CardDescription>Market-wide long/short ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <LongShortRatioChart data={data} period={period} />
          </CardContent>
        </Card>

        {/* Taker Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Taker Buy/Sell Volume
            </CardTitle>
            <CardDescription>Trading volume by taker orders</CardDescription>
          </CardHeader>
          <CardContent>
            <TakerVolumeChart data={data} period={period} />
          </CardContent>
        </Card>

        {/* Basis
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Futures Price Basis
            </CardTitle>
            <CardDescription>Price difference between futures and spot</CardDescription>
          </CardHeader>
          <CardContent>
            <BasisChart data={data} period={period} />
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}