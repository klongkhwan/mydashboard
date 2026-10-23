"use client"

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import { BarChart3 } from "lucide-react"
import { SectionPanel } from "@/components/ui/page-header"
import { MonthSummary } from "@/lib/dashboard-summary"
import { compactMoney, formatThaiMonth, money } from "./format"

interface CashFlowTrendChartProps {
  months: MonthSummary[]
  className?: string
  currency?: "THB" | "USD"
  rate?: number
}

export function CashFlowTrendChart({ months, className, currency = "THB", rate = 34.0 }: CashFlowTrendChartProps) {
  const formatM = (val: number) => money(val, currency, rate)
  const formatCompact = (val: number) => compactMoney(val, currency, rate)

  const chartData = months.map((m) => {
    const totalOutflow = m.paidExpenses
    return {
      monthKey: m.month,
      monthLabel: formatThaiMonth(m.month, true),
      income: m.income,
      outflow: totalOutflow,
      net: m.net,
      raw: m,
    }
  })

  const hasData = chartData.some((d) => d.income > 0 || d.outflow > 0 || d.net !== 0)

  return (
    <SectionPanel
      title="แนวโน้มกระแสเงินสด 6 เดือน"
      description="เปรียบเทียบรายรับ รายจ่าย และกระแสเงินสดสุทธิ"
      icon={BarChart3}
      className={className}
      bodyClassName="p-4"
    >
      {!hasData ? (
        <div className="flex h-72 items-center justify-center text-sm text-spotify-muted">
          ยังไม่มีข้อมูลธุรกรรมหรือการลงทุนในรอบ 6 เดือนที่ผ่านมา
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#6a6a6a"
                tick={{ fill: "#b3b3b3", fontSize: 12 }}
                axisLine={{ stroke: "#252525" }}
                tickLine={false}
              />
              <YAxis
                stroke="#6a6a6a"
                tick={{ fill: "#b3b3b3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => formatCompact(val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-white/10 bg-card p-3 text-xs shadow-xl">
                      <p className="font-bold text-white mb-2">{data.monthLabel}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-primary">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            รายรับ:
                          </span>
                          <span className="font-semibold text-white">{formatM(data.income)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-destructive">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            รายจ่าย:
                          </span>
                          <span className="font-semibold text-white">{formatM(data.outflow)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-1 mt-1">
                          <span className="flex items-center gap-1.5 text-info">
                            <span className="h-2 w-2 rounded-full bg-info" />
                            สุทธิ (Net):
                          </span>
                          <span
                            className={`font-bold ${data.net >= 0 ? "text-primary" : "text-destructive"}`}
                          >
                            {formatM(data.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={36}
                iconType="circle"
                wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
                formatter={(val) => (
                  <span className="text-xs text-muted-foreground mr-2">
                    {val === "income" ? "รายรับ" : val === "outflow" ? "รายจ่าย" : "สุทธิ (Net)"}
                  </span>
                )}
              />
              <Bar dataKey="income" name="income" fill="#1ed760" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="outflow" name="outflow" fill="#f3727f" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line
                type="monotone"
                dataKey="net"
                name="net"
                stroke="#539df5"
                strokeWidth={2.5}
                dot={{ fill: "#539df5", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionPanel>
  )
}
