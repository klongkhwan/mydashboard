import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TradingDataPoint } from "@/types/crypto"

interface OpenInterestChartProps {
  data: any // Change to accept data.series structure
  period: string
}

export function OpenInterestChart({ data, period }: OpenInterestChartProps) {
  // Data is already TradingDataPoint[] from useBinanceData hook
  const chartData = data || []

  // // Debug: Log data to check values
  // console.log('Chart data:', chartData)
  // console.log('Data length:', chartData.length)
  // console.log('Sample data (first 3):', chartData.slice(0, 3))
  // console.log('OpenInterest values:', chartData.map((d: any) => d.openInterest))

  // Calculate dynamic domain for left Y-axis (Open Interest) with 3% padding
  const openInterestValues = chartData.map((d: any) => d.openInterest)
  const minOI = Math.min(...openInterestValues)
  const maxOI = Math.max(...openInterestValues)
  const leftPadding = (maxOI - minOI) * 0.15 // 3% padding
  const leftDomain = [minOI - leftPadding, maxOI + leftPadding]

  // Calculate dynamic domain for right Y-axis (Notional Value) with 3% padding
  const notionalValues = chartData.map((d: any) => d.notionalValue)
  const minNV = Math.min(...notionalValues)
  const maxNV = Math.max(...notionalValues)
  const rightPadding = (maxNV - minNV) * 0.25 // 3% padding
  const rightDomain = [minNV - rightPadding, maxNV + rightPadding]

  const formatOpenInterest = (value: number) => {
    // If value is in millions, show as M with 2 decimal places
    if (value < 1000000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    }
    // If value is in billions, show as B with 2 decimal places
    return `$${(value / 1000000000).toFixed(2)}B`
  }

  const formatMillions = (value: number) => {
    return `$${(value / 1000000).toFixed(2)}M`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const openInterestEntry = payload.find((p: any) => p.dataKey === 'openInterest')
      const notionalEntry = payload.find((p: any) => p.dataKey === 'notionalValue')

      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
          <p className="text-sm font-medium text-card-foreground mb-2">{payload[0].payload.time}</p>

          {openInterestEntry && (
            <div className="flex items-center justify-between gap-4 text-sm mb-1">
              <span className="text-muted-foreground">Open Interest:</span>
              <span className="font-medium text-primary">
                {formatOpenInterest(openInterestEntry.value)}
              </span>
            </div>
          )}

          {notionalEntry && (
            <div className="flex items-center justify-between gap-4 text-sm mb-1">
              <span className="text-muted-foreground">Notional Value:</span>
              <span className="font-medium text-foreground">
                {formatMillions(notionalEntry.value)}
              </span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
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
          interval={Math.ceil(chartData.length / 10)} // Show about 6 ticks
        />

        {/* Left Y-axis - Open Interest (3 ticks max) */}
        <YAxis
          yAxisId="left"
          stroke="#fbbf24"
          fontSize={10}
          tickLine={false}
          tickCount={3}
          tickFormatter={formatOpenInterest}
          domain={leftDomain}
        />

        {/* Right Y-axis - Notional Value (3 ticks max) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#6b7280"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickCount={3}
          tickFormatter={formatMillions}
          domain={rightDomain}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Open Interest bars - solid yellow with fixed width and corner radius */}
        <Bar
          yAxisId="left"
          dataKey="openInterest"
          name="Open Interest"
          fill="#fbbf24" // Solid yellow
          radius={[4, 4, 0, 0]} // Slight corner radius
          barSize={16} // Fixed width
        />

        {/* Notional Value line - smooth white with small dots */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="notionalValue"
          stroke="#ffffff"
          strokeWidth={2}
          name="Notional Value"
          dot={{ r: 3, fill: "#ffffff", stroke: "#6b7280", strokeWidth: 1 }}
          activeDot={{ r: 4, fill: "#ffffff", stroke: "#6b7280", strokeWidth: 2 }}
        />
    </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}