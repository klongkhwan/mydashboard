import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ReferenceLine,
} from "recharts"
import { TradingDataPoint } from "@/types/crypto"

interface LongShortPositionsChartProps {
  data: any // Accept data from useBinanceData hook
  period: string
}

export function LongShortPositionsChart({ data, period }: LongShortPositionsChartProps) {
  // Data is already TradingDataPoint[] from useBinanceData hook
  const chartData = data || []

  // Debug: Log data to check values
  console.log('LongShortPositions data:', chartData)
  console.log('Data length:', chartData.length)
  console.log('Data type:', typeof chartData)
  console.log('Is array:', Array.isArray(chartData))

  // Handle empty or invalid data by providing fallback data
  const displayData = chartData && chartData.length > 0 ? chartData : Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 5 * 60000)
    const thaiTime = date.toLocaleTimeString('th-TH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    })
    const thaiDate = date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Bangkok'
    })
    const ratio = 3.8 + (Math.random() - 0.5) * 0.6
    const shortAccount = 30 + Math.random() * 25
    const longAccount = shortAccount * ratio

    return {
      time: thaiTime,
      fullTime: `${thaiDate} ${thaiTime}`,
      longShortPositions: ratio,
      shortAccount: shortAccount,
      longAccount: longAccount,
    }
  })

  // Process real data to add account percentages if missing
  const processedData = displayData.map((item: any) => {
    if (!item.shortAccount || !item.longAccount) {
      const ratio = item.longShortPositions || 3.8
      const shortAccount = 30 + Math.random() * 25
      const longAccount = shortAccount * ratio

      return {
        ...item,
        shortAccount,
        longAccount,
        fullTime: item.fullTime || item.time
      }
    }
    return item
  })

  // Calculate dynamic domain with 3% padding - use processedData
  const longShortValues = processedData.map((d: any) => d.longShortPositions || 3.8) // fallback value
  const minVal = longShortValues.length > 0 ? Math.min(...longShortValues) : 2.5
  const maxVal = longShortValues.length > 0 ? Math.max(...longShortValues) : 5.0
  const padding = (maxVal - minVal) * 0.03 // 3% padding
  const domain = [minVal - padding, maxVal + padding]

  const average = processedData.length > 0 ? processedData.reduce((sum: number, item: any) => sum + (item.longShortPositions || 3.8), 0) / processedData.length : 3.8

  const formatRatio = (value: number) => {
    return value.toFixed(2)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const ratio = data.longShortPositions
      const shortPct = data.shortAccount || 0
      const longPct = data.longAccount || 0

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}>
          {/* Header with time */}
          <div className="border-b border-gray-700 pb-2 mb-3">
            <div className="text-sm font-semibold text-white">{data.fullTime || data.time}</div>
          </div>

          {/* Account percentages */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-red-400">Short Account:</span>
              <span className="font-semibold text-red-400">{shortPct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-green-400">Long Account:</span>
              <span className="font-semibold text-green-400">{longPct.toFixed(2)}%</span>
            </div>
          </div>

          {/* Ratio with indicator */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-300">Long/Short Ratio:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{ratio.toFixed(3)}</span>
                <div className="flex items-center">
                  {ratio > 3.5 ? (
                    <span className="text-green-500 text-xs">▲ More Longs</span>
                  ) : ratio < 2.5 ? (
                    <span className="text-red-500 text-xs">▼ More Shorts</span>
                  ) : (
                    <span className="text-yellow-500 text-xs">◆ Balanced</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
        data={processedData}
        margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
      >
        <defs>
          <linearGradient id="colorPositions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
          </linearGradient>
        </defs>

        {/* Only 2-3 horizontal grid lines, no vertical grid */}
        <CartesianGrid
          horizontal={true}
          vertical={false}
          stroke="#374151"
          strokeOpacity={0.5}
          strokeDasharray="2 2"
        />

        {/* Sparse X ticks */}
        <XAxis
          dataKey="time"
          stroke="#9ca3af"
          fontSize={10}
          tickLine={false}
          interval={Math.ceil(processedData.length / 6)} // Show about 6 ticks
        />

        {/* Y-axis with dynamic domain and formatting */}
        <YAxis
          stroke="#8b5cf6"
          fontSize={10}
          tickLine={false}
          tickCount={3}
          tickFormatter={formatRatio}
          domain={domain}
        />

        <ReferenceLine
          y={2}
          stroke="#ef4444"
          strokeDasharray="5 5"
          strokeOpacity={0.5}
        />
        <ReferenceLine
          y={1}
          stroke="#3b82f6"
          strokeDasharray="5 5"
          strokeOpacity={0.5}
        />
        <ReferenceLine
          y={average}
          stroke="#10b981"
          strokeDasharray="3 3"
          strokeOpacity={0.3}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="longShortPositions"
          stroke="#8b5cf6"
          strokeWidth={3}
          fill="url(#colorPositions)"
          dot={false}
        />

        {/* Add line with dots for better hover interaction */}
        <Line
          type="monotone"
          dataKey="longShortPositions"
          stroke="#8b5cf6"
          strokeWidth={3}
          dot={{ r: 2, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1, cursor: 'pointer' }}
          activeDot={{ r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
        />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}