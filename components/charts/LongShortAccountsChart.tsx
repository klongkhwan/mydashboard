import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ReferenceLine } from "recharts"

interface LongShortAccountsChartProps {
  data: any // Array of objects with all data
  period: string
}

export function LongShortAccountsChart({ data, period }: LongShortAccountsChartProps) {
  const chartData = data || []
  
  // Debug: Log data to check values (similar to OpenInterestChart)
  console.log('LongShortAccounts Chart data:', chartData)
  // console.log('Data length:', chartData.length)
  // console.log('Sample data (first 3):', chartData.slice(0, 3))
  // console.log('LongShortAccounts values:', chartData.map((d: any) => d.longShortAccounts))
  // console.log('LongAccount values:', chartData.map((d: any) => d.longAccount))
  // console.log('ShortAccount values:', chartData.map((d: any) => d.shortAccount))
  
  // Handle empty data
  const displayData = chartData && chartData.length > 0 ? chartData : Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 5 * 60000)
    const thaiTime = date.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
    
    return {
      time: thaiTime,
      longShortAccounts: 2.5,
      longAccount: 71.43,
      shortAccount: 28.57,
    }
  })
  
  // Calculate dynamic domain with 3% padding
  const longShortValues = displayData.map((d: any) => d.longShortAccounts || 0)
  const minVal = longShortValues.length > 0 ? Math.min(...longShortValues) : 1.5
  const maxVal = longShortValues.length > 0 ? Math.max(...longShortValues) : 3.5
  const padding = (maxVal - minVal) * 0.03
  const domain = [minVal - padding, maxVal + padding]
  
  const formatRatio = (value: number) => {
    return value.toFixed(2)
  }
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      // Use values DIRECTLY from API data
      const ratio = data.longShortAccounts
      const longPct = data.longAccount
      const shortPct = data.shortAccount
      
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid #374151' }}>
          {/* Header with time */}
          <div className="border-b border-gray-700 pb-2 mb-3">
            <div className="text-sm font-semibold text-white">{data.time}</div>
          </div>
          
          {/* Account percentages - DIRECT from API */}
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
          
          {/* Ratio with indicator - DIRECT from API */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-gray-300">Long/Short Ratio:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{ratio.toFixed(4)}</span>
                <div className="flex items-center">
                  {ratio > 2 ? (
                    <span className="text-green-500 text-xs">▲ More Longs</span>
                  ) : ratio < 1.5 ? (
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
          data={displayData} 
          margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
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
            interval={Math.ceil(displayData.length / 6)}
          />
          
          {/* Y-axis with dynamic domain and formatting */}
          <YAxis 
            stroke="#6366f1" 
            fontSize={10} 
            tickLine={false} 
            tickCount={3} 
            tickFormatter={formatRatio}
            domain={domain}
          />
          
          <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.5} />
          <ReferenceLine y={1} stroke="#3b82f6" strokeDasharray="5 5" strokeOpacity={0.5} />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area 
            type="monotone" 
            dataKey="longShortAccounts" 
            stroke="#6366f1" 
            strokeWidth={3} 
            fill="url(#colorRatio)" 
            dot={false} 
          />
          
          {/* Add line with dots for better hover interaction */}
          <Line 
            type="monotone" 
            dataKey="longShortAccounts" 
            stroke="#6366f1" 
            strokeWidth={3} 
            dot={{ r: 2, fill: '#6366f1', stroke: '#fff', strokeWidth: 1, cursor: 'pointer' }}
            activeDot={{ r: 3, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}