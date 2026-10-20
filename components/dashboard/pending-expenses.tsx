import { Clock } from "lucide-react"
import { SectionPanel } from "@/components/ui/page-header"
import { PendingSummary } from "@/lib/dashboard-summary"
import { money, formatThaiDate } from "./format"

interface PendingExpensesProps {
  data: PendingSummary
  className?: string
  currency?: "THB" | "USD"
  rate?: number
}

export function PendingExpenses({ data, className, currency = "THB", rate = 34.0 }: PendingExpensesProps) {
  const { total, count, items } = data
  const formatM = (val: number) => money(val, currency, rate)

  return (
    <SectionPanel
      title="รายจ่ายค้างชำระ"
      description="ยอดค่าใช้จ่ายที่ยังไม่ได้ชำระ (Pending)"
      icon={Clock}
      className={className}
      bodyClassName="p-4 flex flex-col justify-between"
    >
      {/* Total Pending Header */}
      <div className="mb-4 rounded-lg border border-white/5 bg-[#181818] p-3">
        <span className="text-spotify-label">ยอดค้างชำระทั้งหมด</span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#ffa42b]">{formatM(total)}</span>
          <span className="text-xs text-spotify-muted">({count} รายการ)</span>
        </div>
      </div>

      {/* Items List (up to 6) */}
      <div className="space-y-2 flex-1">
        <span className="text-spotify-label text-[#7c7c7c]">รายการที่ค้างชำระ</span>

        {items.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-center text-xs text-spotify-muted">
            ไม่มีรายจ่ายที่ค้างชำระ
          </div>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {items.map((item) => {
              const label =
                item.merchant_or_payer ||
                item.description ||
                item.wealth_categories?.name ||
                "ไม่ระบุชื่อ"
              const categoryName = item.wealth_categories?.name

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-[#181818] p-2.5 text-xs transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-spotify-muted">
                      {formatThaiDate(item.transaction_date)}
                      {categoryName && ` · ${categoryName}`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-bold text-[#f3727f]">{formatM(item.amount_thb)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SectionPanel>
  )
}
