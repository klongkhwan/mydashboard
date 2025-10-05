import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { TradingDataPoint } from "@/types/crypto"

interface TakerVolumeChartProps {
  data: any // Accept data from useBinanceData hook
  period: string
}

export function TakerVolumeChart({ data, period }: TakerVolumeChartProps) {
  // Data is already TradingDataPoint[] from useBinanceData hook
  const chartData = data || []

  // Debug: Log data to check values
  // console.log('TakerVolume data:', chartData)
  // console.log('Data length:', chartData.length)
  // console.log('Data type:', typeof chartData)
  // console.log('Is array:', Array.isArray(chartData))

  // Handle empty or invalid data by providing fallback data
  const displayData = chartData && chartData.length > 0 ? chartData : Array.from({ length: 30 }, (_, i) => {
    const thaiTime = new Date(Date.now() - (29 - i) * 5 * 60000).toLocaleTimeString('th-TH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    })
    const takerBuy = 7000000000 + (Math.random() - 0.5) * 3000000000
    const takerSell = 7000000000 + (Math.random() - 0.5) * 3000000000
    return {
      time: thaiTime,
      takerBuy,
      takerSell,
    }
  })

  const formatValue = (value: number) => {
    // Show 2 decimal places for better precision
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    return `$${value.toFixed(2)}`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const buyVolume = payload.find((p: any) => p.dataKey === 'takerBuy')?.value || 0
      const sellVolume = payload.find((p: any) => p.dataKey === 'takerSell')?.value || 0
      const total = buyVolume + sellVolume
      const buyRatio = ((buyVolume / total) * 100).toFixed(1)
      const sellRatio = ((sellVolume / total) * 100).toFixed(1)

      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
          <p className="text-sm font-medium text-card-foreground mb-2">{payload[0].payload.time}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-green-600">🟢 Buy:</span>
              <span className="font-medium">{formatValue(buyVolume)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-red-600">🔴 Sell:</span>
              <span className="font-medium">{formatValue(sellVolume)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="font-medium">{formatValue(total)}</span>
            </div>
            <div className="text-xs text-gray-500 pt-1 border-t">
              {buyRatio}% Buy / {sellRatio}% Sell
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate dynamic padding based on max volume difference
  const maxVolume = Math.max(...displayData.map((item: any) => Math.max(item.takerBuy || 0, item.takerSell || 0)))
  const minVolume = Math.min(...displayData.map((item: any) => Math.min(item.takerBuy || 0, item.takerSell || 0)))
  const volumeRange = maxVolume - minVolume
  const dynamicPadding = volumeRange * 0.1
  const yAxisDomain = [minVolume - dynamicPadding, maxVolume + dynamicPadding]

  const enhancedData = displayData.map((item: any) => ({
    ...item,
    buySellRatio: (item.takerBuy || 0) / ((item.takerBuy || 0) + (item.takerSell || 0)),
    dominance: (item.takerBuy || 0) > (item.takerSell || 0) ? 'buy' : 'sell'
  }))

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
        data={enhancedData}
        margin={{ top: 20, right: 60, left: 40, bottom: 20 }}
      >
        {/* Only 2-3 horizontal grid lines, no vertical grid */}
        <CartesianGrid
          horizontal={true}
          vertical={false}
          stroke="#e5e7eb"
          strokeOpacity={0.5}
          strokeDasharray="2 2"
        />

        {/* Sparse X ticks */}
        <XAxis
          dataKey="time"
          stroke="#6b7280"
          fontSize={10}
          tickLine={false}
          interval={Math.ceil(displayData.length / 12)} // Show about 6 ticks
        />

        {/* Y-axis with proper formatting */}
        <YAxis
          stroke="#06b6d4"
          fontSize={10}
          tickLine={false}
          tickCount={3}
          domain={yAxisDomain}
          tickFormatter={formatValue}
        />

        <Tooltip content={<CustomTooltip />} />

        <Bar
          dataKey="takerSell"
          fill="#ef4444"
          name="Taker Sell"
          radius={[0, 0, 4, 4]}
        />
        <Bar
          dataKey="takerBuy"
          fill="#10b981"
          name="Taker Buy"
          radius={[4, 4, 0, 0]}
        />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}