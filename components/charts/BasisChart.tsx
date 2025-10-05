import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { TradingDataPoint } from "@/types/crypto"

interface BasisChartProps {
  data: any // Accept data from useBinanceData hook
  period: string
}

export function BasisChart({ data, period }: BasisChartProps) {
  // Data is already TradingDataPoint[] from useBinanceData hook
  const chartData = data || []

  // Debug: Log data to check values
  console.log('Basis data:', chartData)
  console.log('Data length:', chartData.length)
  console.log('Data type:', typeof chartData)
  console.log('Is array:', Array.isArray(chartData))

  // Handle empty or invalid data by providing fallback data
  const displayData = chartData && chartData.length > 0 ? chartData : Array.from({ length: 30 }, (_, i) => {
    const thaiTime = new Date(Date.now() - (29 - i) * 5 * 60000).toLocaleTimeString('th-TH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    })
    const futuresPrice = 0.255 + (Math.random() - 0.5) * 0.005
    const priceIndex = futuresPrice - 0.0003
    return {
      time: thaiTime,
      futuresPrice,
      priceIndex,
      basis: futuresPrice - priceIndex,
    }
  })

  const formatPrice = (value: number) => {
    // Show more decimal places for DOGE
    if (value < 1) return `$${value.toFixed(4)}`
    if (value >= 1000) return `$${value.toFixed(2)}`
    return `$${value.toFixed(3)}`
  }

  const formatBasis = (value: number) => {
    return `${value.toFixed(3)}%`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const futuresPrice = payload.find((p: any) => p.dataKey === 'futuresPrice')?.value || 0
      const priceIndex = payload.find((p: any) => p.dataKey === 'priceIndex')?.value || 0
      const basis = payload.find((p: any) => p.dataKey === 'basis')?.value || 0

      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
          <p className="text-sm font-medium text-card-foreground mb-2">{payload[0].payload.time}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Futures:</span>
              <span className="font-medium text-green-600">{formatPrice(futuresPrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Index:</span>
              <span className="font-medium text-blue-600">{formatPrice(priceIndex)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Basis:</span>
              <span className="font-medium text-purple-600">{formatBasis(basis)}</span>
            </div>
            <div className="text-xs text-gray-500 pt-1 border-t">
              {basis > 0 ? "🟢 Contango" : basis < 0 ? "🔴 Backwardation" : "🟡 Neutral"}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const averageBasis = displayData.length > 0 ? displayData.reduce((sum: number, item: any) => sum + (item.basis || 0), 0) / displayData.length : 0

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
        data={displayData}
        margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
      >
        <defs>
          <linearGradient id="colorFutures" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorBasis" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
          </linearGradient>
        </defs>

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
          interval={Math.ceil(displayData.length / 6)} // Show about 6 ticks
        />

        {/* Left Y-axis - Price */}
        <YAxis
          yAxisId="left"
          stroke="#10b981"
          fontSize={10}
          tickLine={false}
          tickCount={3}
          tickFormatter={formatPrice}
        />

        {/* Right Y-axis - Basis */}
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#8b5cf6"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickCount={3}
          tickFormatter={formatBasis}
        />

        <ReferenceLine
          yAxisId="right"
          y={0}
          stroke="#6b7280"
          strokeDasharray="5 5"
          strokeOpacity={0.5}
        />
        <ReferenceLine
          yAxisId="right"
          y={averageBasis}
          stroke="#8b5cf6"
          strokeDasharray="3 3"
          strokeOpacity={0.3}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          yAxisId="left"
          type="monotone"
          dataKey="futuresPrice"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#colorFutures)"
          name="Futures Price"
        />

        <Line
          yAxisId="left"
          type="monotone"
          dataKey="priceIndex"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Price Index"
        />

        <Bar
          yAxisId="right"
          dataKey="basis"
          fill="url(#colorBasis)"
          name="Basis"
          radius={[4, 4, 0, 0]}
        />
    </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}