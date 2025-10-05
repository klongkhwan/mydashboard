import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { TradingDataPoint } from "@/types/crypto"

interface LongShortPositionsChartProps {
  data: TradingDataPoint[] | any
  period: string
}

export function LongShortPositionsChart({ data, period }: LongShortPositionsChartProps) {
  const chartData = Array.isArray(data) ? data : []

  // Fallback 30 จุด (Positions)
  const displayData = chartData.length > 0
    ? chartData
    : Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - (29 - i) * 5 * 60000)
        const thaiTime = date.toLocaleTimeString('th-TH', {
          hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
        })
        const thaiDate = date.toLocaleDateString('th-TH', {
          day: '2-digit', month: '2-digit', timeZone: 'Asia/Bangkok'
        })

        const ratio = 3.8 + (Math.random() - 0.5) * 0.6 // ~3.8
        const shortPosition = 100 / (1 + ratio)
        const longPosition  = 100 - shortPosition

        return {
          time: thaiTime,
          fullTime: `${thaiDate} ${thaiTime}`,
          longShortPositions: ratio,
          shortPosition,
          longPosition,
        }
      })

  // เติม % จาก ratio ถ้าไม่มี
  const processedData = displayData.map((item: any) => {
    const ratio = Number(item.longShortPositions) || 0
    let { longPosition, shortPosition } = item
    if (longPosition == null || shortPosition == null) {
      if (ratio > 0) {
        shortPosition = 100 / (1 + ratio)
        longPosition  = 100 - shortPosition
      } else {
        shortPosition = 0; longPosition = 0
      }
    }
    return {
      ...item,
      longPosition: Number(longPosition),
      shortPosition: Number(shortPosition),
      fullTime: item.fullTime || item.time
    }
  })

  // Domain dynamic + padding 3%
  const values = processedData.map((d: any) => Number(d.longShortPositions) || 0)
  const minVal = values.length ? Math.min(...values) : 2.5
  const maxVal = values.length ? Math.max(...values) : 5.0
  const padding = (maxVal - minVal) * 0.15
  const domain: [number, number] = [minVal - padding, maxVal + padding]

  const average = processedData.length
    ? processedData.reduce((s: number, it: any) => s + (Number(it.longShortPositions) || 0), 0) / processedData.length
    : (minVal + maxVal) / 2

  const formatRatio = (v: number) => v.toFixed(2)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      const ratio = Number(d.longShortPositions) || 0
      const shortPct = Number(d.shortPosition) || 0
      const longPct  = Number(d.longPosition) || 0

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl" style={{ backgroundColor:'#1a1a1a', border:'1px solid #374151' }}>
          <div className="border-b border-gray-700 pb-2 mb-3">
            <div className="text-sm font-semibold text-white">{d.fullTime || d.time}</div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between"><span className="text-sm text-red-400">Short Position:</span><span className="font-semibold text-red-400">{shortPct.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-sm text-green-400">Long Position:</span><span className="font-semibold text-green-400">{longPct.toFixed(2)}%</span></div>
          </div>

          {/* ปรับรูปแบบ ratio */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-300">Long/Short Positions Ratio:</span>
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
    <div style={{ width:'100%', height:'300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={processedData} margin={{ top:20, right:60, left:60, bottom:20 }}>
          <defs>
            <linearGradient id="colorPositions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.30}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          <CartesianGrid horizontal vertical={false} stroke="#374151" strokeOpacity={0.5} strokeDasharray="2 2" />
          <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickLine={false} interval={Math.ceil(processedData.length / 12)} />
          <YAxis stroke="#8b5cf6" fontSize={10} tickLine={false} tickCount={3} tickFormatter={formatRatio} domain={domain} />

          <ReferenceLine y={average} stroke="#8b5cf6" strokeDasharray="3 3" strokeOpacity={0.3} />

          <Tooltip content={<CustomTooltip />} />

          {/* พื้นหลังใต้เส้น */}
          <Area
            type="monotone"
            dataKey="longShortPositions"
            stroke="#8b5cf6"
            strokeWidth={3}
            fill="url(#colorPositions)"
            dot={false}
          />

          {/* เส้น + จุดเพื่อ hover ชัด */}
          <Line
            type="monotone"
            dataKey="longShortPositions"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ r: 2, fill:'#8b5cf6', stroke:'#fff', strokeWidth:1, cursor:'pointer' }}
            activeDot={{ r:3, fill:'#8b5cf6', stroke:'#fff', strokeWidth:2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
