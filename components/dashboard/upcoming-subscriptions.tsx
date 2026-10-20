import { CreditCard } from "lucide-react"
import { SectionPanel } from "@/components/ui/page-header"
import { SubscriptionsSummary } from "@/lib/dashboard-summary"
import { money, formatThaiDate } from "./format"

interface UpcomingSubscriptionsProps {
  data: SubscriptionsSummary
  className?: string
  currency?: "THB" | "USD"
  rate?: number
}

function getCycleLabel(cycle: string) {
  switch (cycle) {
    case "monthly":
      return "รายเดือน"
    case "yearly":
      return "รายปี"
    case "weekly":
      return "รายสัปดาห์"
    default:
      return cycle
  }
}

export function UpcomingSubscriptions({ data, className, currency = "THB", rate = 34.0 }: UpcomingSubscriptionsProps) {
  const { monthlyCost, upcoming } = data
  const formatM = (val: number) => money(val, currency, rate)

  return (
    <SectionPanel
      title="Subscriptions"
      description="ค่าบริการรายงวดและรายการที่ใกล้ครบกำหนด"
      icon={CreditCard}
      className={className}
      bodyClassName="p-4 flex flex-col justify-between"
    >
      {/* Monthly Total Header */}
      <div className="mb-4 rounded-lg border border-white/5 bg-[#181818] p-3">
        <span className="text-spotify-label">ค่าใช้จ่ายเฉลี่ยต่อเดือน</span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{formatM(monthlyCost)}</span>
          <span className="text-xs text-spotify-muted">/ เดือน</span>
        </div>
      </div>

      {/* Upcoming List */}
      <div className="space-y-2 flex-1">
        <span className="text-spotify-label text-[#7c7c7c]">ใกล้ครบกำหนด (ใน 14 วัน)</span>

        {upcoming.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-center text-xs text-spotify-muted">
            ไม่มีรายการที่จะครบกำหนดใน 14 วันนี้
          </div>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {upcoming.map((sub) => {
              const days = sub.daysLeft
              let badgeColor = "bg-white/5 text-[#b3b3b3] border-white/10"
              let badgeText = `อีก ${days} วัน`

              if (days < 0) {
                badgeColor = "bg-[#f3727f]/15 text-[#f3727f] border-[#f3727f]/30"
                badgeText = `เลย ${Math.abs(days)} วัน`
              } else if (days === 0) {
                badgeColor = "bg-[#ffa42b]/20 text-[#ffa42b] border-[#ffa42b]/40"
                badgeText = "วันนี้"
              } else if (days <= 3) {
                badgeColor = "bg-[#ffa42b]/15 text-[#ffa42b] border-[#ffa42b]/30"
                badgeText = `อีก ${days} วัน`
              }

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-[#181818] p-2.5 text-xs transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-semibold text-white">{sub.name}</p>
                    <p className="text-[11px] text-spotify-muted">
                      {formatThaiDate(sub.next_billing_date)} · {getCycleLabel(sub.billing_cycle)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-white">{formatM(sub.price)}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}
                    >
                      {badgeText}
                    </span>
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
