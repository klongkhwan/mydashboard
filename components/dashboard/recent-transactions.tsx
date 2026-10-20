import { ArrowUpDown } from "lucide-react"
import { SectionPanel } from "@/components/ui/page-header"
import { RecentTransactionItem } from "@/lib/dashboard-summary"
import { money, formatThaiDate } from "./format"

interface RecentTransactionsProps {
  items: RecentTransactionItem[]
  className?: string
  currency?: "THB" | "USD"
  rate?: number
}

export function RecentTransactions({ items, className, currency = "THB", rate = 34.0 }: RecentTransactionsProps) {
  const formatM = (val: number) => money(val, currency, rate)
  return (
    <SectionPanel
      title="ธุรกรรมล่าสุด"
      description="รายการรายรับและรายจ่าย 8 รายการล่าสุด"
      icon={ArrowUpDown}
      className={className}
      bodyClassName="p-4"
    >
      {items.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-center text-xs text-spotify-muted">
          ยังไม่มีข้อมูลธุรกรรม
        </div>
      ) : (
        <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {items.map((tx) => {
            const isIncome = tx.type === "income"
            const isPending = tx.payment_status === "pending"
            const label =
              tx.merchant_or_payer ||
              tx.description ||
              tx.wealth_categories?.name ||
              (isIncome ? "รายรับ" : "รายจ่าย")
            const categoryName = tx.wealth_categories?.name
            const categoryColor = tx.wealth_categories?.color || (isIncome ? "#1ed760" : "#539df5")

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-[#181818] p-2.5 text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-spotify-muted">
                      {formatThaiDate(tx.transaction_date)}
                      {categoryName && ` · ${categoryName}`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isPending && (
                    <span className="rounded-full border border-[#ffa42b]/30 bg-[#ffa42b]/10 px-1.5 py-0.5 text-[10px] text-[#ffa42b]">
                      ค้างจ่าย
                    </span>
                  )}
                  <span
                    className={`font-bold ${
                      isIncome ? "text-primary" : "text-white"
                    }`}
                  >
                    {isIncome ? `+${formatM(tx.amount_thb)}` : `-${formatM(tx.amount_thb)}`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionPanel>
  )
}
