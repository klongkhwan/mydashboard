"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Calculator, TrendingUp, TrendingDown } from "lucide-react"

interface TradingCalculatorProps {
  isOpen: boolean
  onClose: () => void
}

interface CalculatorValues {
  side: 'long' | 'short'
  leverage: number
  balance: number
  entryPrice: number
  exitPrice: number
  qty: number
  roiTarget: number
  mmRate: number // Maintenance Margin Rate (MMR)
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

export function TradingCalculator({ isOpen, onClose }: TradingCalculatorProps) {
  const [values, setValues] = useState<CalculatorValues>({
    side: 'long',
    leverage: 10,
    balance: 0,
    entryPrice: 0,
    exitPrice: 0,
    qty: 0,
    roiTarget: 0,
    mmRate: 0.0045 // Fixed 0.45% maintenance margin rate
  })

  const [results, setResults] = useState<CalculatorResults>({
    marginInitial: 0,
    pnl: 0,
    roi: 0,
    targetPrice: 0,
    liquidationPrice: 0,
    maxOpen: 0,
    maxOpenCoin: 0
  })

  // Calculate results whenever input values change
  useEffect(() => {
    calculateResults()
  }, [values])

  const calculateResults = () => {
    const { side, leverage, balance, entryPrice, exitPrice, qty, roiTarget } = values

    // Calculate Margin Initial
    const marginInitial = entryPrice * qty / leverage

    // Calculate PNL
    let pnl = 0
    if (side === 'long') {
      pnl = (exitPrice - entryPrice) * qty
    } else {
      pnl = (entryPrice - exitPrice) * qty
    }

    // Calculate ROI
    const roi = marginInitial > 0 ? (pnl / marginInitial) * 100 : 0

    // Calculate Target Price based on ROI target with leverage consideration
    let targetPrice = 0
    if (roiTarget !== 0 && entryPrice > 0 && leverage > 0) {
      // Formula with leverage: Target Price = Entry Price × (1 + (ROI Target / Leverage))
      // ROI Target on actual capital, not leveraged position
      const effectiveRoiTarget = roiTarget / leverage
      if (side === 'long') {
        targetPrice = entryPrice * (1 + effectiveRoiTarget / 100)
      } else {
        targetPrice = entryPrice * (1 - effectiveRoiTarget / 100)
      }
    }

    // Calculate Liquidation Price (cross liquidation formula with MMR)
    let liquidationPrice = 0
    const { mmRate } = values

    // Use the actual quantity if provided, otherwise calculate from margin and leverage
    const actualQty = qty > 0 ? qty : (marginInitial * leverage) / entryPrice

    if (actualQty > 0 && leverage > 1) {
      const positionValue = entryPrice * actualQty

      if (side === 'long') {
        // P_liq (Long) = ((P_entry * Q) - B) / (Q * (1 - MMR))
        const numerator = positionValue - balance
        const denominator = actualQty * (1 + mmRate)
        liquidationPrice = numerator / denominator
      } else if (side === 'short') {
        // P_liq (Short) = ((P_entry * Q) + B) / (Q * (1 + MMR))
        const numerator = positionValue + balance
        const denominator = actualQty * (1 - mmRate)
        liquidationPrice = numerator / denominator
      }
    }

    // Calculate Max Open (USD)
    const maxOpen = balance * leverage

    // Calculate Max Open Coin (maximum quantity based on entry price)
    let maxOpenCoin = 0
    if (entryPrice > 0 && maxOpen > 0) {
      maxOpenCoin = maxOpen / entryPrice
    }

    setResults({
      marginInitial,
      pnl,
      roi,
      targetPrice,
      liquidationPrice,
      maxOpen,
      maxOpenCoin
    })
  }

  const handleInputChange = (field: keyof CalculatorValues, value: string | number | boolean) => {
    setValues(prev => ({
      ...prev,
      [field]: field === 'side' ? value : Number(value)
    }))
  }

  const handleUseTargetPrice = () => {
    if (results.targetPrice > 0) {
      setValues(prev => ({
        ...prev,
        exitPrice: results.targetPrice
      }))
    }
  }

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 text-gray-100 border-2 border-gray-700 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-white">
                Trading Calculator
              </h2>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entry Side */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Badge variant="outline" className="text-blue-500 border-blue-500 bg-blue-500/10">
                    Entry
                  </Badge>
                  ข้อมูลการเทรด
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Long/Short Toggle Button */}
                <div className="space-y-2">
                  <ToggleGroup
                    type="single"
                    value={values.side}
                    onValueChange={(value) => value && handleInputChange('side', value)}
                    className="w-full"
                  >
                    <ToggleGroupItem
                      value="long"
                      className="flex-1 data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=on]:border-green-500 border-gray-600 text-gray-300 hover:bg-green-500/20"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Long
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="short"
                      className="flex-1 data-[state=on]:bg-red-500 data-[state=on]:text-white data-[state=on]:border-red-500 border-gray-600 text-gray-300 hover:bg-red-500/20"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Short
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Leverage */}
                <div className="space-y-2">
                  <Label htmlFor="leverage" className="text-gray-300">
                    ค่า Leverage: <span className="text-blue-500 font-bold">{values.leverage}x</span>
                  </Label>
                  <Slider
                    id="leverage"
                    min={1}
                    max={100}
                    step={1}
                    value={[values.leverage]}
                    onValueChange={(value) => handleInputChange('leverage', value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1x</span>
                    <span>25x</span>
                    <span>50x</span>
                    <span>75x</span>
                    <span>100x</span>
                  </div>
                </div>

                {/* Balance */}
                <div className="space-y-2">
                  <Label htmlFor="balance" className="text-gray-300">Balance (USD)</Label>
                  <Input
                    id="balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.balance}
                    onChange={(e) => handleInputChange('balance', e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Entry Price */}
                <div className="space-y-2">
                  <Label htmlFor="entryPrice" className="text-gray-300">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.entryPrice}
                    onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Exit Price */}
                <div className="space-y-2">
                  <Label htmlFor="exitPrice" className="text-gray-300">Exit Price</Label>
                  <Input
                    id="exitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.exitPrice}
                    onChange={(e) => handleInputChange('exitPrice', e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="qty" className="text-gray-300">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    step="0.001"
                    value={values.qty}
                    onChange={(e) => handleInputChange('qty', e.target.value)}
                    placeholder="0.000"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* ROI Target */}
                <div className="space-y-2">
                  <Label htmlFor="roiTarget" className="text-gray-300">ROI Target (%)</Label>
                  <Input
                    id="roiTarget"
                    type="number"
                    step="0.1"
                    value={values.roiTarget}
                    onChange={(e) => handleInputChange('roiTarget', e.target.value)}
                    placeholder="0.0"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Result Side */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Badge variant="outline" className="text-green-500 border-green-500 bg-green-500/10">
                    Result
                  </Badge>
                  ผลการคำนวณ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Margin Initial */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">Margin Initial</span>
                  <span className="text-lg font-bold text-blue-500">
                    {formatCurrency(results.marginInitial)}
                  </span>
                </div>

                {/* PNL */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">PNL</span>
                  <div className="flex items-center gap-2">
                    {results.pnl > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : results.pnl < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : null}
                    <span className={`text-lg font-bold ${
                      results.pnl > 0 ? 'text-green-500' :
                      results.pnl < 0 ? 'text-red-500' :
                      'text-gray-400'
                    }`}>
                      {formatCurrency(results.pnl)}
                    </span>
                  </div>
                </div>

                {/* ROI */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">ROI</span>
                  <span className={`text-lg font-bold ${
                    results.roi > 0 ? 'text-green-500' :
                    results.roi < 0 ? 'text-red-500' :
                    'text-gray-400'
                  }`}>
                    {formatNumber(results.roi)}%
                  </span>
                </div>

                {/* Liquidation Price */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">Liquidation Price</span>
                  <span className="text-lg font-bold text-red-500">
                    {results.liquidationPrice > 0 ? formatNumber(results.liquidationPrice) : '-'}
                  </span>
                </div>

                {/* Target Price */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">Target Price</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-500">
                      {results.targetPrice > 0 ? formatNumber(results.targetPrice) : '-'}
                    </span>
                    {results.targetPrice > 0 && (
                      <Button
                        onClick={handleUseTargetPrice}
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs bg-purple-500/10 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                      >
                        Use
                      </Button>
                    )}
                  </div>
                </div>

                {/* Max Open */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">Max Open (USD)</span>
                  <span className="text-lg font-bold text-orange-500">
                    {formatCurrency(results.maxOpen)}
                  </span>
                </div>

                {/* Max Open Coin */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-300">Max Open (Coin)</span>
                  <span className="text-lg font-bold text-cyan-500">
                    {results.maxOpenCoin > 0 ? formatNumber(results.maxOpenCoin, 6) : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}