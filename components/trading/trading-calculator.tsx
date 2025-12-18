"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, TrendingUp, TrendingDown, Crosshair, DollarSign, Percent, AlertTriangle, Target } from "lucide-react"

interface TradingCalculatorProps {
  isOpen: boolean
  onClose: () => void
}

/* -------------------------------------------------------------------------- */
/*                           TRADING CALCULATOR LOGIC                         */
/* -------------------------------------------------------------------------- */

interface CalculatorValues {
  side: 'long' | 'short'
  leverage: number
  balance: number
  entryPrice: number
  exitPrice: number
  qty: number
  roiTarget: number
  mmRate: number
}

interface CalculatorResults {
  marginInitial: number
  pnl: number
  roi: number
  targetPrice: number
  liquidationPrice: number
  maxOpen: number
  maxOpenCoin: number
}

/* -------------------------------------------------------------------------- */
/*                           POSITION SIZING LOGIC                            */
/* -------------------------------------------------------------------------- */

interface PositionValues {
  side: 'long' | 'short' // NEW: Direction logic
  balance: number
  riskPercent: number
  entryPrice: number
  stopLossPrice: number
  takeProfitPrice: number // NEW: Take Profit
}

interface PositionResults {
  riskAmount: number
  positionSizeCoins: number
  positionValueUsd: number
  leverageRequired: number
  rewardAmount: number // NEW: Reward $
  riskRewardRatio: number // NEW: R:R ratio
  isValid: boolean
  error?: string
}


export function TradingCalculator({ isOpen, onClose }: TradingCalculatorProps) {
  // ------------------------- STATE: TRADING CALCULATOR ------------------------
  const [calcValues, setCalcValues] = useState<CalculatorValues>({
    side: 'long',
    leverage: 10,
    balance: 0,
    entryPrice: 0,
    exitPrice: 0,
    qty: 0,
    roiTarget: 0,
    mmRate: 0.0045
  })

  const [calcResults, setCalcResults] = useState<CalculatorResults>({
    marginInitial: 0,
    pnl: 0,
    roi: 0,
    targetPrice: 0,
    liquidationPrice: 0,
    maxOpen: 0,
    maxOpenCoin: 0
  })

  // ------------------------- STATE: POSITION SIZING ---------------------------
  const [posValues, setPosValues] = useState<PositionValues>({
    side: 'long',
    balance: 0,
    riskPercent: 1.0,
    entryPrice: 0,
    stopLossPrice: 0,
    takeProfitPrice: 0
  })

  const [posResults, setPosResults] = useState<PositionResults>({
    riskAmount: 0,
    positionSizeCoins: 0,
    positionValueUsd: 0,
    leverageRequired: 0,
    rewardAmount: 0,
    riskRewardRatio: 0,
    isValid: true
  })

  const [activeTab, setActiveTab] = useState("trading")


  // ------------------------- EFFECT: RESET ON OPEN -------------------------
  useEffect(() => {
    if (isOpen) {
      setPosValues({
        side: 'long',
        balance: 0,
        riskPercent: 1.0,
        entryPrice: 0,
        stopLossPrice: 0,
        takeProfitPrice: 0
      })
    }
  }, [isOpen])

  // ------------------------- EFFECT: TRADING CALCULATOR -----------------------
  useEffect(() => {
    calculateTradingResults()
  }, [calcValues])

  const calculateTradingResults = () => {
    const { side, leverage, balance, entryPrice, exitPrice, qty, roiTarget, mmRate } = calcValues

    // Margin Initial
    const marginInitial = (entryPrice * qty) / leverage

    // PNL
    let pnl = 0
    if (side === 'long') {
      pnl = (exitPrice - entryPrice) * qty
    } else {
      pnl = (entryPrice - exitPrice) * qty
    }

    // ROI
    const roi = marginInitial > 0 ? (pnl / marginInitial) * 100 : 0

    // Target Price
    let targetPrice = 0
    if (roiTarget !== 0 && entryPrice > 0 && leverage > 0) {
      const effectiveRoiTarget = roiTarget / leverage
      if (side === 'long') {
        targetPrice = entryPrice * (1 + effectiveRoiTarget / 100)
      } else {
        targetPrice = entryPrice * (1 - effectiveRoiTarget / 100)
      }
    }

    // Liquidation Price
    let liquidationPrice = 0
    const actualQty = qty > 0 ? qty : (marginInitial * leverage) / entryPrice
    if (actualQty > 0 && leverage > 1) {
      const positionValue = entryPrice * actualQty
      if (side === 'long') {
        const numerator = positionValue - balance
        const denominator = actualQty * (1 + mmRate)
        liquidationPrice = numerator / denominator
      } else {
        const numerator = positionValue + balance
        const denominator = actualQty * (1 - mmRate)
        liquidationPrice = numerator / denominator
      }
    }

    // Max Open
    const maxOpen = balance * leverage
    let maxOpenCoin = 0
    if (entryPrice > 0 && maxOpen > 0) {
      maxOpenCoin = maxOpen / entryPrice
    }

    setCalcResults({
      marginInitial,
      pnl,
      roi,
      targetPrice,
      liquidationPrice: liquidationPrice > 0 ? liquidationPrice : 0,
      maxOpen,
      maxOpenCoin
    })
  }

  // ------------------------- EFFECT: POSITION SIZING --------------------------
  useEffect(() => {
    calculatePositionSize()
  }, [posValues])

  const calculatePositionSize = () => {
    const { side, balance, riskPercent, entryPrice, stopLossPrice, takeProfitPrice } = posValues

    if (balance <= 0 || entryPrice <= 0 || stopLossPrice <= 0) {
      setPosResults({
        riskAmount: 0, positionSizeCoins: 0, positionValueUsd: 0, leverageRequired: 0, rewardAmount: 0, riskRewardRatio: 0, isValid: true
      })
      return
    }

    // Validation: Check SL Direction
    if (side === 'long' && stopLossPrice >= entryPrice) {
      setPosResults({ riskAmount: 0, positionSizeCoins: 0, positionValueUsd: 0, leverageRequired: 0, rewardAmount: 0, riskRewardRatio: 0, isValid: false, error: "For LONG, Stop Loss must be LOWER than Entry" })
      return
    }
    if (side === 'short' && stopLossPrice <= entryPrice) {
      setPosResults({ riskAmount: 0, positionSizeCoins: 0, positionValueUsd: 0, leverageRequired: 0, rewardAmount: 0, riskRewardRatio: 0, isValid: false, error: "For SHORT, Stop Loss must be HIGHER than Entry" })
      return
    }

    // Risk Amount ($)
    const riskAmount = balance * (riskPercent / 100)

    // Stop Loss Distance (per unit)
    const slDistance = Math.abs(entryPrice - stopLossPrice)

    // Position Size (Coins) = Risk Amount / SL Distance
    const positionSizeCoins = riskAmount / slDistance

    // Position Value (USD) = Coins * Entry Price
    const positionValueUsd = positionSizeCoins * entryPrice

    // Leverage Required
    const leverageRequired = positionValueUsd / balance

    // Reward & R:R
    let rewardAmount = 0
    let riskRewardRatio = 0
    if (takeProfitPrice > 0) {
      const tpDistance = Math.abs(takeProfitPrice - entryPrice)
      rewardAmount = positionSizeCoins * tpDistance
      if (riskAmount > 0) {
        riskRewardRatio = rewardAmount / riskAmount
      }
    }

    setPosResults({
      riskAmount,
      positionSizeCoins,
      positionValueUsd,
      leverageRequired,
      rewardAmount,
      riskRewardRatio,
      isValid: true
    })
  }

  // ------------------------- HANDLERS ---------------------------------------
  const handleCalcChange = (field: keyof CalculatorValues, value: string | number | boolean) => {
    setCalcValues(prev => ({
      ...prev,
      [field]: field === 'side' ? value : Number(value)
    }))
  }

  const handlePosChange = (field: keyof PositionValues, value: string | number | boolean) => {
    setPosValues(prev => ({
      ...prev,
      [field]: field === 'side' ? value : Number(value)
    }))
  }

  const handleUseTargetPrice = () => {
    if (calcResults.targetPrice > 0) {
      setCalcValues(prev => ({ ...prev, exitPrice: calcResults.targetPrice }))
    }
  }

  // ------------------------- HELPERS -----------------------------------------
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(num)
  }
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(num)
  }

  // Leverage Color Helper
  const getLeverageColor = (lev: number) => {
    if (lev <= 3) return 'bg-[#39FF14]' // Safe (Green)
    if (lev <= 10) return 'bg-yellow-500' // Medium
    return 'bg-red-500' // High Risk
  }
  const getLeverageLabel = (lev: number) => {
    if (lev <= 3) return 'Safe'
    if (lev <= 10) return 'Medium'
    return 'High Risk'
  }
  const getLeverageTextColor = (lev: number) => {
    if (lev <= 3) return 'text-[#39FF14]'
    if (lev <= 10) return 'text-yellow-500'
    return 'text-red-500'
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#09090b] text-gray-100 border border-gray-800 rounded-xl w-full max-w-5xl h-[75vh] overflow-hidden flex flex-col shadow-2xl">

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Calculator</h2>
              <p className="text-xs text-muted-foreground">คำนวณกำไรและขนาด Position</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            ✕
          </Button>
        </div>

        {/* CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <Tabs defaultValue="trading" className="w-full space-y-6" onValueChange={setActiveTab}>

            {/* TABS LIST */}
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50 p-1 rounded-lg">
              <TabsTrigger
                value="trading"
                className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black font-semibold transition-all"
              >
                Trading Calculator
              </TabsTrigger>
              <TabsTrigger
                value="positionsize"
                className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black font-semibold transition-all"
              >
                Position Sizing
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TRADING CALCULATOR */}
            <TabsContent value="trading" className="space-y-6 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ... (Existing Trading Calculator Layout - same as before) ... */}
                {/* LEFT: INPUTS */}
                <Card className="bg-zinc-900/50 border-zinc-800 shadow-inner">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">

                    {/* Direction */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Direction</Label>
                      <ToggleGroup type="single" value={calcValues.side} onValueChange={(v) => v && handleCalcChange('side', v)} className="w-full justify-start gap-2">
                        <ToggleGroupItem value="long" className="flex-1 data-[state=on]:bg-green-500/20 data-[state=on]:text-green-500 data-[state=on]:border-green-500 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-all">
                          Long
                        </ToggleGroupItem>
                        <ToggleGroupItem value="short" className="flex-1 data-[state=on]:bg-red-500/20 data-[state=on]:text-red-500 data-[state=on]:border-red-500 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-all">
                          Short
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {/* Leverage */}
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Leverage</Label>
                        <span className="text-sm font-bold text-blue-400">{calcValues.leverage}x</span>
                      </div>
                      <Slider
                        min={1} max={100} step={1}
                        value={[calcValues.leverage]}
                        onValueChange={(v) => handleCalcChange('leverage', v[0])}
                        className="py-1 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="balance" className="text-xs text-muted-foreground">Balance (USD)</Label>
                        <Input id="balance" type="number" value={calcValues.balance || ''} onChange={(e) => handleCalcChange('balance', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14] transition-colors" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qty" className="text-xs text-muted-foreground">Quantity</Label>
                        <Input id="qty" type="number" value={calcValues.qty || ''} onChange={(e) => handleCalcChange('qty', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14] transition-colors" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="entry" className="text-xs text-muted-foreground">Entry Price</Label>
                        <Input id="entry" type="number" value={calcValues.entryPrice || ''} onChange={(e) => handleCalcChange('entryPrice', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14] transition-colors" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exit" className="text-xs text-muted-foreground">Exit Price</Label>
                        <Input id="exit" type="number" value={calcValues.exitPrice || ''} onChange={(e) => handleCalcChange('exitPrice', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14] transition-colors" placeholder="0.00" />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <Label htmlFor="roiTarget" className="text-xs text-muted-foreground">Values Target (%)</Label>
                      <div className="flex gap-2">
                        <Input id="roiTarget" type="number" value={calcValues.roiTarget || ''} onChange={(e) => handleCalcChange('roiTarget', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14] transition-colors" placeholder="e.g. 50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RIGHT: RESULTS */}
                <Card className="bg-zinc-900/80 border-zinc-800 h-full flex flex-col">
                  <CardHeader className="pb-4 border-b border-zinc-800/50">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-[#39FF14] flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col">

                    <div className="grid grid-cols-1 divide-y divide-zinc-800/50">
                      {/* PNL Block */}
                      <div className="p-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                        <span className="text-sm text-gray-300">PNL</span>
                        <div className="text-right">
                          <div className={`text-2xl font-bold tabular-nums ${calcResults.pnl > 0 ? "text-[#39FF14]" : calcResults.pnl < 0 ? "text-red-500" : "text-gray-500"}`}>
                            {calcResults.pnl > 0 ? "+" : ""}{formatCurrency(calcResults.pnl)}
                          </div>
                          <div className={`text-xs ${calcResults.roi > 0 ? "text-green-400" : calcResults.roi < 0 ? "text-red-400" : "text-gray-500"}`}>
                            {calcResults.roi.toFixed(2)}% ROI
                          </div>
                        </div>
                      </div>

                      {/* Margin Block */}
                      <div className="p-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                        <span className="text-sm text-gray-300">Initial Margin</span>
                        <span className="text-lg font-semibold text-white tabular-nums">{formatCurrency(calcResults.marginInitial)}</span>
                      </div>

                      {/* Target Price */}
                      <div className="p-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                        <span className="text-sm text-gray-300">Target Price ({calcValues.roiTarget}%)</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-purple-400 tabular-nums">
                            {calcResults.targetPrice > 0 ? formatNumber(calcResults.targetPrice) : '-'}
                          </span>
                          {calcResults.targetPrice > 0 && (
                            <Button size="sm" variant="outline" onClick={handleUseTargetPrice} className="h-6 text-[10px] px-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/20">
                              Use
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Liquidation */}
                      <div className="p-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                        <span className="text-sm text-gray-300">Liq. Price</span>
                        <span className="text-lg font-bold text-orange-500 tabular-nums">
                          {calcResults.liquidationPrice > 0 ? formatNumber(calcResults.liquidationPrice) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 mt-auto bg-zinc-950/50 border-t border-zinc-800">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Max Open (USD)</span>
                        <span>{formatCurrency(calcResults.maxOpen)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Max Open (Coin)</span>
                        <span>{formatNumber(calcResults.maxOpenCoin, 4)}</span>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: POSITION SIZING (NEW ENHANCEMENTS) */}
            <TabsContent value="positionsize" className="space-y-6 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT: INPUTS */}
                <Card className="bg-zinc-900/50 border-zinc-800 shadow-inner">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Crosshair className="w-4 h-4" /> Risk Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">

                    {/* NEW: Direction Toggle (Affects Validation) */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground">Direction</Label>
                      <ToggleGroup type="single" value={posValues.side} onValueChange={(v) => v && handlePosChange('side', v)} className="w-full justify-start gap-2">
                        <ToggleGroupItem value="long" className="flex-1 data-[state=on]:bg-green-500/20 data-[state=on]:text-green-500 data-[state=on]:border-green-500 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-all">
                          Long
                        </ToggleGroupItem>
                        <ToggleGroupItem value="short" className="flex-1 data-[state=on]:bg-red-500/20 data-[state=on]:text-red-500 data-[state=on]:border-red-500 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-all">
                          Short
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ps-balance" className="text-xs text-muted-foreground">Account Balance (USD)</Label>
                      <Input id="ps-balance" type="number" value={posValues.balance || ''} onChange={(e) => handlePosChange('balance', e.target.value)}
                        className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14]" placeholder="e.g 1000" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="ps-risk" className="text-xs text-muted-foreground">Risk per Trade (%)</Label>
                        <span className="text-xs font-bold text-red-400">{posValues.riskPercent}%</span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <Slider min={0.1} max={10} step={0.1} value={[posValues.riskPercent]} onValueChange={(v) => handlePosChange('riskPercent', v[0].toString())} className="flex-1" />
                        <Input type="number" value={posValues.riskPercent} onChange={(e) => handlePosChange('riskPercent', e.target.value)} className="w-20 bg-zinc-950 border-zinc-800 text-center" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                      <div className="space-y-2">
                        <Label htmlFor="ps-entry" className="text-xs text-muted-foreground">Entry Price</Label>
                        <Input id="ps-entry" type="number" value={posValues.entryPrice || ''} onChange={(e) => handlePosChange('entryPrice', e.target.value)}
                          className="bg-zinc-950 border-zinc-800 focus:border-[#39FF14]" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ps-stoploss" className="text-xs text-muted-foreground">Stop Loss Price</Label>
                        {/* Dynamic Border Color based on validation/direction? */}
                        <Input id="ps-stoploss" type="number" value={posValues.stopLossPrice || ''} onChange={(e) => handlePosChange('stopLossPrice', e.target.value)}
                          className={`bg-zinc-950 border-zinc-800 focus:border-red-500`} placeholder="0.00" />
                      </div>
                    </div>

                    {/* NEW: Take Profit */}
                    <div className="space-y-2">
                      <Label htmlFor="ps-takeprofit" className="text-xs text-muted-foreground">Take Profit Price (Optional)</Label>
                      <Input id="ps-takeprofit" type="number" value={posValues.takeProfitPrice || ''} onChange={(e) => handlePosChange('takeProfitPrice', e.target.value)}
                        className="bg-zinc-950 border-zinc-800 focus:border-green-500" placeholder="0.00" />
                    </div>

                  </CardContent>
                </Card>

                {/* RIGHT: RESULTS */}
                <Card className="bg-zinc-900/80 border-zinc-800 h-full flex flex-col relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/[0.02] -z-0" />

                  <CardHeader className="pb-4 border-b border-zinc-800/50 z-10 bg-zinc-900/80">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-[#39FF14] flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Position Size
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0 z-10 flex-1 flex flex-col justify-center">
                    {!posResults.isValid && posResults.error ? (
                      <div className="p-8 text-center text-red-500">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{posResults.error}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800/50">
                        <div className="p-6 text-center">
                          <p className="text-sm text-gray-400 mb-1">Recommended Quantity</p>
                          <div className="text-4xl font-black text-white tracking-tight tabular-nums">
                            {formatNumber(posResults.positionSizeCoins, 4)}
                            <span className="text-lg font-normal text-gray-500 ml-2">Coins</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-zinc-800/50">
                          <div className="p-5 text-center hover:bg-zinc-800/20 transition-colors">
                            <p className="text-xs text-gray-400 mb-1">Risk Amount</p>
                            <div className="text-lg font-bold text-red-500 tabular-nums">
                              {formatCurrency(posResults.riskAmount)}
                            </div>
                          </div>
                          <div className="p-5 text-center hover:bg-zinc-800/20 transition-colors">
                            <p className="text-xs text-gray-400 mb-1">Reward ({posResults.riskRewardRatio > 0 ? `1:${posResults.riskRewardRatio.toFixed(1)}` : '-'})</p>
                            <div className="text-lg font-bold text-green-500 tabular-nums">
                              {posResults.rewardAmount > 0 ? formatCurrency(posResults.rewardAmount) : '-'}
                            </div>
                          </div>
                        </div>

                        <div className="p-5 bg-zinc-950/30">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Effective Leverage</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getLeverageColor(posResults.leverageRequired)} text-black`}>
                                {getLeverageLabel(posResults.leverageRequired)}
                              </span>
                              <span className={`text-sm font-bold ${getLeverageTextColor(posResults.leverageRequired)}`}>
                                {posResults.leverageRequired.toFixed(2)}x
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden relative">
                            {/* Leverage Markers */}
                            <div className="absolute top-0 bottom-0 w-px bg-gray-500 left-[3%] opacity-50" title="3x" />
                            <div className="absolute top-0 bottom-0 w-px bg-gray-500 left-[10%] opacity-50" title="10x" />

                            <div
                              className={`h-full rounded-full ${getLeverageColor(posResults.leverageRequired)}`}
                              style={{ width: `${Math.min(posResults.leverageRequired, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  )
}