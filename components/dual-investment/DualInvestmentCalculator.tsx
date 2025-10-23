"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, TrendingDown, Calculator, DollarSign, Calendar } from "lucide-react"
import { DualInvestmentProject } from "@/lib/dual-investment"

interface DualInvestmentCalculatorProps {
  isOpen: boolean
  onClose: () => void
  project: DualInvestmentProject | null
}

interface CalculationResult {
  scenario: "above" | "below"
  amount: number
  principal: number
  interest: number
  total: number
  totalCoins?: number // For Sell High below price scenario
}

export function DualInvestmentCalculator({ isOpen, onClose, project }: DualInvestmentCalculatorProps) {
  const [amount, setAmount] = useState<string>("")
  const [calculation, setCalculation] = useState<CalculationResult | null>(null)

  const calculateResults = () => {
    if (!project || !amount || parseFloat(amount) <= 0) {
      setCalculation(null)
      return
    }

    const apr = parseFloat(project.apr) * 100 // Convert to percentage
    const duration = parseInt(project.duration)
    const strikePrice = parseFloat(project.strikePrice)
    const inputAmount = parseFloat(amount)

    // Calculate interest rate for the duration
    const dailyRate = apr / 100 / 365
    const totalRate = dailyRate * duration

    if (project.type === "DOWN") {
      // Buy Low - Input is in USDC
      const principal = inputAmount
      const interest = principal * totalRate
      const total = principal + interest

      setCalculation({
        scenario: "above" as const,
        amount: inputAmount,
        principal,
        interest,
        total
      })
    } else {
      // Sell High - Input is in coins
      const principalCoins = inputAmount
      const principalValue = principalCoins * strikePrice // Value in USDC at strike price
      const interestValue = principalValue * totalRate
      const totalValue = principalValue + interestValue
      const totalCoins = totalValue / strikePrice

      setCalculation({
        scenario: "above" as const,
        amount: inputAmount,
        principal: principalCoins,
        interest: interestValue,
        total: totalValue,
        totalCoins
      })
    }
  }

  const resetCalculation = () => {
    setAmount("")
    setCalculation(null)
  }

  const handleClose = () => {
    resetCalculation()
    onClose()
  }

  // Auto-calculate when amount changes
  useEffect(() => {
    calculateResults()
  }, [amount, project])

  // Initial calculation when project changes
  useEffect(() => {
    if (project && amount) {
      calculateResults()
    }
  }, [project])

  if (!project) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Dual Investment Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate potential returns for this investment
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Project Details and Input */}
          <div className="space-y-4">
            {/* Project Details */}
            <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {project.type === "UP" ? (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                )}
                {project.type === "UP" ? project.investmentAsset : project.targetAsset} - {project.type === "UP" ? "Sell High" : "Buy Low"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Strike Price</span>
                <span className="font-mono font-semibold">
                  ${parseFloat(project.strikePrice).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">APR</span>
                <span className="font-semibold text-green-600">
                  {(parseFloat(project.apr) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-semibold">
                  {project.duration} day{project.duration !== "1" ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Settlement Date</span>
                <span className="font-semibold">
                  {new Date(parseInt(project.settleTime)).toLocaleDateString('en-GB')}
                </span>
              </div>
            </CardContent>
          </Card>

            {/* Input Section */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                {project.type === "DOWN"
                  ? "Enter amount in USDC"
                  : `Enter amount in ${project.investmentAsset}`
                }
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16 text-left"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {project.type === "DOWN" ? "USDC" : project.investmentAsset}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Results */}
          <div className="space-y-4">
            {calculation && (
              <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Calculation Results</CardTitle>
                <CardDescription>
                  Based on {project.type === "UP" ? "Sell High" : "Buy Low"} scenario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.type === "DOWN" ? (
                  // Buy Low Results
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Price ≥ ${parseFloat(project.strikePrice).toLocaleString()}
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-green-600">
                          <span>You will receive:</span>
                          <span className="font-semibold">
                            ${calculation.total.toLocaleString()} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span>
                            ${calculation.principal.toLocaleString()} USDC
                          </span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Rewards:</span>
                          <span className="font-semibold">
                            ${calculation.interest.toFixed(2)} USDC
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total USDC:</span>
                          <span className="text-teal-600 underline">
                            ${calculation.total.toFixed(2)} USDC
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        Price &lt; ${parseFloat(project.strikePrice).toLocaleString()}
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-green-600" >
                          <span>You will receive:</span>
                          <span className="font-semibold">
                            {(calculation.total / parseFloat(project.strikePrice)).toFixed(6)} {project.targetAsset}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span>
                            ${calculation.principal.toLocaleString()} USDC
                          </span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Rewards:</span>
                          <span className="font-semibold">
                            ${calculation.interest.toFixed(2)} USDC
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total USDC:</span>
                          <span className="text-teal-600 underline">
                            ${calculation.total.toFixed(2)} USDC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Sell High Results
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Price ≥ ${parseFloat(project.strikePrice).toLocaleString()}
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-green-600">
                          <span>You will receive:</span>
                          <span className="font-semibold">
                            ${calculation.total.toFixed(2)} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span>
                            {calculation.principal.toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Rewards:</span>
                          <span className="font-semibold">
                            {(calculation.interest / parseFloat(project.strikePrice)).toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total Coin:</span>
                          <span className="text-teal-600 underline">
                            {calculation.totalCoins?.toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        Price &lt; ${parseFloat(project.strikePrice).toLocaleString()}
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-green-600">
                          <span>You will receive:</span>
                          <span className="font-semibold">
                            {calculation.totalCoins?.toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span>
                            {calculation.principal.toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Rewards:</span>
                          <span className="font-semibold">
                            {((calculation.totalCoins || 0) - calculation.principal).toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total Coin:</span>
                          <span className="text-teal-600 underline">
                            {calculation.totalCoins?.toFixed(6)} {project.investmentAsset}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}