'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, Save } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"

interface CoinData {
  symbol: string
  name: string
}

interface CoinSelectionTableProps {
  onSave?: () => void
  saveButtonText?: string
}

const availableCoins: CoinData[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "Binance Coin" },
  { symbol: "XRP", name: "Xrp" },
  { symbol: "DOGE", name: "Doge" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "ASTER", name: "Aster" },
]

export function CoinSelectionTable({ onSave, saveButtonText = "Save Settings" }: CoinSelectionTableProps) {
  const { settings, updateCoinDisplay, updateSettings } = useSettings()

  const handleSave = () => {
    // Settings are already auto-saved when toggling switches
    // This just provides feedback to user
    if (onSave) {
      onSave()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            <div>
              <CardTitle>Coin Display Settings</CardTitle>
              <CardDescription>Configure which coins are displayed on the dashboard</CardDescription>
            </div>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {saveButtonText}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg font-medium text-sm">
            <div>Coin</div>
            <div className="text-center">Show</div>
            <div className="text-center">Title</div>
          </div>

          {/* Coin Display Rows */}
          <div className="grid gap-2 max-h-96 overflow-y-auto pr-2">
            {availableCoins.map((coin) => {
              const coinDisplay = settings.coinDisplays?.find(cd => cd.symbol === coin.symbol)
              const isShown = coinDisplay?.show || false
              const isTitle = coinDisplay?.isTitle || false

              return (
                <div key={coin.symbol} className="grid grid-cols-3 gap-4 p-3 rounded-lg border">
                  {/* Coin Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {coin.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{coin.name}</p>
                      <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                    </div>
                  </div>

                  {/* Show Switch */}
                  <div className="flex items-center justify-center">
                    <Switch
                      checked={isShown}
                      onCheckedChange={(checked) => {
                        updateCoinDisplay(coin.symbol, 'show', checked)
                      }}
                    />
                  </div>

                  {/* Title Switch */}
                  <div className="flex items-center justify-center">
                    <Switch
                      checked={isTitle}
                      disabled={!isShown}
                      onCheckedChange={(checked) => {
                        if (checked && !isShown) {
                          // Auto-enable show if trying to set as title
                          updateCoinDisplay(coin.symbol, 'show', true)
                        }
                        updateCoinDisplay(coin.symbol, 'isTitle', checked)
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}