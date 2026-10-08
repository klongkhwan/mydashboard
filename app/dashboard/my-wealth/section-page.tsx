import { Landmark, ReceiptText, WalletCards, FolderCog } from "lucide-react"
import { MyWealthQuickActions } from "@/components/my-wealth/quick-actions"
import { PageHeader } from "@/components/ui/page-header"
import { getMyWealthData } from "./actions"

type Section = "investments" | "income" | "expenses" | "categories"

const sectionConfig = {
  investments: { title: "Investments", eyebrow: "Portfolio activity", description: "บันทึกดีลของ Dime, Bybit และ Binance TH ให้เห็นจังหวะเงินเข้า–ออกชัดเจน", mode: "investment" as const, icon: Landmark },
  income: { title: "Income", eyebrow: "Cash in", description: "บันทึกเงินเดือน รายได้จากการขาย และรายรับอื่น ๆ ในที่เดียว", mode: "income" as const, icon: WalletCards },
  expenses: { title: "Expenses", eyebrow: "Cash out", description: "เห็นทุกค่าใช้จ่าย ทั้งที่ชำระแล้วและรายการที่รอจ่าย", mode: "expense" as const, icon: ReceiptText },
  categories: { title: "Categories", eyebrow: "Organize", description: "จัดหมวดรายการให้สรุปภาพการเงินของคุณอ่านง่ายขึ้น", mode: "category" as const, icon: FolderCog },
}

export async function MyWealthSectionPage({ section }: { section: Section }) {
  const data = await getMyWealthData()
  const config = sectionConfig[section]
  const Icon = config.icon
  const rows = section === "investments" ? data.investments : section === "categories" ? data.categories : data.transactions.filter((item: any) => item.type === (section === "income" ? "income" : "expense"))
  const total = section === "categories" ? rows.length : rows.reduce((sum: number, item: any) => sum + Number(section === "investments" ? item.opened_amount_thb : item.amount_thb), 0)

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
      <PageHeader
        eyebrow={`My Wealth · ${config.eyebrow}`}
        title={config.title}
        description={config.description}
        action={
          <MyWealthQuickActions categories={data.categories} allowedModes={[config.mode]} />
        }
      />

      <section className="card-spotify overflow-hidden border border-white/5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-bold text-white">{config.title}</h2>
            <p className="mt-0.5 text-xs text-spotify-muted">Total {rows.length.toLocaleString()} items</p>
          </div>

          <div className="rounded-full bg-[#1f1f1f] px-4 py-1.5 text-xs font-bold text-white border border-white/5">
            {section === "categories" ? `${total} Categories` : `฿${total.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`}
          </div>
        </div>
        <div className="max-h-[32rem] divide-y divide-white/5 overflow-y-auto">
          {rows.map((item: any) =>
            section === "investments" ? (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:px-6">
                <div className="min-w-0">
                  <p className="font-bold text-white">
                    {item.asset_symbol}
                    <span className="ml-2 text-xs font-normal text-spotify-muted">
                      {item.platform.toUpperCase()} · {item.status}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-spotify-muted">Opened on {item.opened_at}</p>
                </div>
                <p className="whitespace-nowrap font-bold text-white tabular-nums">
                  ฿{Number(item.opened_amount_thb).toLocaleString()}
                </p>
              </div>
            ) : section === "categories" ? (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:px-6">
                <p className="font-bold text-white">{item.name}</p>
                <span className="rounded-full bg-[#1f1f1f] px-3 py-1 text-xs text-spotify-muted border border-white/5">
                  {item.type === "income" ? "Income" : "Expense"}
                  {!item.is_active && " · Inactive"}
                </span>
              </div>
            ) : (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {item.description || item.merchant_or_payer || item.wealth_categories?.name || "Untitled"}
                  </p>
                  <p className="mt-0.5 text-xs text-spotify-muted">
                    {item.transaction_date}
                    {section === "expenses" && item.payment_status === "pending" ? " · Pending" : ""}
                  </p>
                </div>
                <p className={`whitespace-nowrap font-bold tabular-nums ${section === "income" ? "text-primary" : "text-destructive"}`}>
                  {section === "income" ? "+" : "-"}฿{Number(item.amount_thb).toLocaleString()}
                </p>
              </div>
            )
          )}
          {rows.length === 0 && (
            <div className="px-6 py-14 text-center">
              <p className="font-medium text-white">No records found</p>
              <p className="mt-1 text-sm text-spotify-muted">Get started by creating your first entry using the button above.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
