'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, Save } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"

import { ReusableDataTable } from "@/components/ui/reusable-data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"

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
  { symbol: "XRP", name: "XRP" },
  { symbol: "DOGE", name: "Doge" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "ASTER", name: "ASTER" },
]

export function CoinSelectionTable({ onSave, saveButtonText = "Save Settings" }: CoinSelectionTableProps) {
  const { settings, updateCoinDisplay } = useSettings()

  const handleSave = () => {
    if (onSave) onSave()
  }

  const columns = useMemo<ColumnDef<CoinData>[]>(() => [
    {
      accessorKey: "symbol",
      header: "Coin",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-surface-hover flex items-center justify-center flex-shrink-0 group-hover:shadow-play transition-all">
            <span className="text-[11px] font-black text-primary uppercase">{row.original.symbol.substring(0, 2)}</span>
          </div>
          <div>
            <p className="font-bold text-white group-hover:text-primary transition-colors">{row.original.name}</p>
            <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest">{row.original.symbol}</p>
          </div>
        </div>
      )
    },
    {
      id: "show",
      header: "Show",
      cell: ({ row }) => {
        const coinDisplay = settings.coinDisplays?.find(cd => cd.symbol === row.original.symbol)
        const isShown = coinDisplay?.show || false
        return (
          <div className="flex items-center justify-center">
            <Switch
              checked={isShown}
              onCheckedChange={(checked) => {
                updateCoinDisplay(row.original.symbol, 'show', checked)
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        )
      }
    },
    {
      id: "title",
      header: "Title",
      cell: ({ row }) => {
        const coinDisplay = settings.coinDisplays?.find(cd => cd.symbol === row.original.symbol)
        const isShown = coinDisplay?.show || false
        const isTitle = coinDisplay?.isTitle || false
        return (
          <div className="flex items-center justify-center">
            <Switch
              checked={isTitle}
              disabled={!isShown}
              onCheckedChange={(checked) => {
                updateCoinDisplay(row.original.symbol, 'isTitle', checked)
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        )
      }
    }
  ], [settings.coinDisplays, updateCoinDisplay])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-spotify-label">Coin Display Settings</h2>
          <p className="text-spotify-muted text-xs mt-1 uppercase tracking-widest font-bold">Configure which coins are displayed on the dashboard</p>
        </div>
        <Button onClick={handleSave} variant="pill" className="">
          <Save className="h-4 w-4 mr-2" />
          {saveButtonText}
        </Button>
      </div>

      <ReusableDataTable
        columns={columns}
        data={availableCoins}
        pageSize={10}
        manualPagination={false}
      />
    </div>
  )
}
