import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import { PriceData } from "@/types/crypto"

const priceData: PriceData[] = [
  { symbol: "BTC", name: "Bitcoin", price: 43250.5, change: 2.45, volume: "28.5B" },
  { symbol: "ETH", name: "Ethereum", price: 2650.75, change: -1.23, volume: "15.2B" },
  { symbol: "BNB", name: "Binance Coin", price: 315.2, change: 0.85, volume: "2.1B" },
  { symbol: "ADA", name: "Cardano", price: 0.485, change: 3.21, volume: "1.8B" },
  { symbol: "SOL", name: "Solana", price: 98.45, change: -0.67, volume: "3.2B" },
]

interface PriceTabProps {
  selectedCoins: string[]
  setSelectedCoins: (coins: string[]) => void
}

export function PriceTab({ selectedCoins, setSelectedCoins }: PriceTabProps) {
  const availableCoins = ["BTC", "ETH", "BNB", "ADA", "SOL", "MATIC", "LINK", "DOT"]

  const handleCoinToggle = (coin: string) => {
    if (selectedCoins.includes(coin)) {
      setSelectedCoins(selectedCoins.filter((c) => c !== coin))
    } else {
      setSelectedCoins([...selectedCoins, coin])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          ราคา Cryptocurrency
        </CardTitle>
        <CardDescription>ติดตามราคาแบบ Real-time พร้อมตัวเลือกที่ปรับแต่งได้</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {availableCoins.map((coin) => (
              <Button
                key={coin}
                variant={selectedCoins.includes(coin) ? "default" : "outline"}
                size="sm"
                onClick={() => handleCoinToggle(coin)}
              >
                {coin}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {priceData
            .filter((coin) => selectedCoins.includes(coin.symbol))
            .map((coin) => (
              <div key={coin.symbol} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-bold text-primary text-sm">{coin.symbol}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{coin.name}</h3>
                      <p className="text-sm text-muted-foreground">Volume: {coin.volume}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">${coin.price.toLocaleString()}</p>
                    <div
                      className={`flex items-center gap-1 text-sm ${coin.change >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {coin.change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {coin.change >= 0 ? "+" : ""}
                      {coin.change}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}