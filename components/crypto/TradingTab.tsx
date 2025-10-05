import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3 } from "lucide-react"
import { OpenInterestChart } from "@/components/charts/OpenInterestChart"
import { LongShortAccountsChart } from "@/components/charts/LongShortAccountsChart"
import { LongShortPositionsChart } from "@/components/charts/LongShortPositionsChart"
import { LongShortRatioChart } from "@/components/charts/LongShortRatioChart"
import { TakerVolumeChart } from "@/components/charts/TakerVolumeChart"
import { BasisChart } from "@/components/charts/BasisChart"
import { useBinanceData } from "@/hooks/useBinanceData"

interface TradingTabProps {
  symbol: string
  period: string
  onSymbolChange: (symbol: string) => void
  onPeriodChange: (period: string) => void
}

export function TradingTab({ symbol, period, onSymbolChange, onPeriodChange }: TradingTabProps) {
  const { data, isLoading, apiError, refetch } = useBinanceData(symbol, period)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Trading Info
          </CardTitle>
          <CardDescription>
            ข้อมูลการเทรดและวิเคราะห์ตลาด Futures จาก Binance
            {apiError && " (ใช้ข้อมูลตัวอย่าง - API ไม่สามารถเข้าถึงได้)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">Symbol</label>
              <Select value={symbol} onValueChange={onSymbolChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOGEUSDC">DOGE/USDC</SelectItem>
                  <SelectItem value="BTCUSDC">BTC/USDC</SelectItem>
                  <SelectItem value="ETHUSDC">ETH/USDC</SelectItem>
                  <SelectItem value="BNBUSDC">BNB/USDC</SelectItem>
                  <SelectItem value="SOLUSDC">SOL/USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">Timeframe</label>
              <Select value={period} onValueChange={onPeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 นาที</SelectItem>
                  <SelectItem value="15">15 นาที</SelectItem>
                  <SelectItem value="30">30 นาที</SelectItem>
                  <SelectItem value="60">1 ชั่วโมง</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={refetch} disabled={isLoading}>
              {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OpenInterestChart data={data} period={period} />
        <LongShortAccountsChart data={data} period={period} />
        <LongShortPositionsChart data={data} period={period} />
        <LongShortRatioChart data={data} period={period} />
        <TakerVolumeChart data={data} period={period} />
        <BasisChart data={data} period={period} />
      </div>
    </div>
  )
}