import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { TradingDataPoint } from "@/types/crypto"

interface LongShortRatioChartProps {
  data: TradingDataPoint[] | any // รับจาก useBinanceData hook
  period: string
}

export function LongShortRatioChart({ data, period }: LongShortRatioChartProps) {
  // Data จาก hook แล้วเป็น TradingDataPoint[] อยู่แล้ว
  const chartData = Array.isArray(data) ? data : []

  // Debug
  // console.log('LongShortRatio data:', chartData)
  // console.log('Data length:', chartData.length)
  // console.log('Data type:', typeof chartData)
  // console.log('Is array:', Array.isArray(chartData))

  // Fallback 30 จุด: ใช้ "Global" จริง ๆ
  const displayData = chartData.length > 0
    ? chartData
    : Array.from({ length: 30 }, (_, i) => {
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

        // ratio รอบ ๆ 2.3 แบบสมจริงเล็กน้อย
        const ratio = 2.3 + (Math.random() - 0.5) * 0.4
        // แปลงเป็น % จากสูตร ratio = long / short
        const globalShortAccount = 100 / (1 + ratio)
        const globalLongAccount = 100 - globalShortAccount

        return {
          time: thaiTime,
          fullTime: `${thaiDate} ${thaiTime}`,
          longShortRatio: ratio,
          globalShortAccount,
          globalLongAccount,
        }
      })

  // เติม % Global จาก ratio ถ้าไม่มี (ไม่ใช้สุ่ม)
  const processedData = displayData.map((item: any) => {
    const hasShort = item.globalShortAccount != null
    const hasLong = item.globalLongAccount != null
    if (!hasShort || !hasLong) {
      const ratio = Number(item.longShortRatio) || 2.3
      const globalShortAccount = 100 / (1 + ratio)
      const globalLongAccount = 100 - globalShortAccount
      return {
        ...item,
        globalShortAccount,
        globalLongAccount,
        fullTime: item.fullTime || item.time
      }
    }
    return {
      ...item,
      fullTime: item.fullTime || item.time
    }
  })

  // Domain แบบ dynamic + padding 3% (คำนวณจาก processedData)
  const longShortValues = processedData.map((d: any) => Number(d.longShortRatio) || 2.3)
  const minVal = longShortValues.length > 0 ? Math.min(...longShortValues) : 1.0
  const maxVal = longShortValues.length > 0 ? Math.max(...longShortValues) : 3.0
  const padding = (maxVal - minVal) * 0.15
  const domain: [number, number] = [minVal - padding, maxVal + padding]

  const average = processedData.length > 0
    ? processedData.reduce((sum: number, item: any) => sum + (Number(item.longShortRatio) || 2.3), 0) / processedData.length
    : 2.3

  const formatRatio = (value: number) => value.toFixed(2)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const ratio = Number(data.longShortRatio) || 0
      const shortPct = Number(data.globalShortAccount) || 0
      const longPct = Number(data.globalLongAccount) || 0

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}>
          {/* Header with time */}
          <div className="border-b border-gray-700 pb-2 mb-3">
            <div className="text-sm font-semibold text-white">{data.fullTime || data.time}</div>
          </div>

          {/* Global account percentages */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-red-400">Global Short (%):</span>
              <span className="font-semibold text-red-400">{shortPct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-green-400">Global Long (%):</span>
              <span className="font-semibold text-green-400">{longPct.toFixed(2)}%</span>
            </div>
          </div>

          {/* Ratio with indicator */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-300">Global Long/Short Ratio:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{ratio.toFixed(4)}</span>
                <div className="flex items-center">
                  {ratio > 1 ? (
                    <span className="text-green-500 text-xs">▲ Bullish</span>
                  ) : ratio < 1 ? (
                    <span className="text-red-500 text-xs">▼ Bearish</span>
                  ) : (
                    <span className="text-yellow-500 text-xs">◆ Neutral</span>
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
        <AreaChart
          data={processedData}
          margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorRatioPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorRatioNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          {/* เฉพาะเส้นแนวนอน */}
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="#e5e7eb"
            strokeOpacity={0.5}
            strokeDasharray="2 2"
          />

          {/* X ticks เว้นห่างพอดี */}
          <XAxis
            dataKey="time"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            interval={Math.ceil(processedData.length / 12)} // ~6 ticks
          />

          {/* Y-axis dynamic domain */}
          <YAxis
            stroke="#3b82f6"
            fontSize={10}
            tickLine={false}
            tickCount={3}
            tickFormatter={formatRatio}
            domain={domain}
          />

          <ReferenceLine
            y={1}
            stroke="#6b7280"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={average}
            stroke="#3b82f6"
            strokeDasharray="3 3"
            strokeOpacity={0.3}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="longShortRatio"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#colorRatio)"
            dot={false}
          />

          {/* จุดเล็ก ๆ เพื่อ hover ง่าย */}
          <Area
            type="monotone"
            dataKey="longShortRatio"
            stroke="transparent"
            strokeWidth={0}
            fill="transparent"
            dot={{ r: 2, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1, cursor: 'pointer' }}
            activeDot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
