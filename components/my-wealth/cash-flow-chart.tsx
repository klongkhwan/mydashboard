"use client"

type CashFlowRow = { date: string; income: number; expenses: number }

const money = (value: number) =>
  new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value)

export function MyWealthCashFlowChart({ rows }: { rows: CashFlowRow[] }) {
  const visibleRows = [...rows].sort((left, right) => left.date.localeCompare(right.date))
  const maxValue = Math.max(1, ...visibleRows.flatMap((row) => [row.income, row.expenses]))

  return (
    <section className="card-spotify p-5 sm:p-6 space-y-4 border border-white/5 bg-[#181818]/60">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">กราฟกระแสเงินสดรายวัน (Daily Cash Flow)</h2>
          <p className="text-spotify-muted mt-0.5 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" /> เขียว: รายรับ
            <span className="inline-block w-2 h-2 rounded-full bg-[#f3727f] ml-3 mr-1" /> แดง: รายจ่ายจริง
          </p>
        </div>
        <span className="text-xs text-spotify-muted font-bold">{visibleRows.length} วันที่มีรายการ</span>
      </div>

      <div className="flex h-56 items-end gap-1.5 sm:gap-2 overflow-x-auto pb-4 pt-2 scrollbar-thin">
        {visibleRows.map((row) => {
          const net = row.income - row.expenses
          const incomePct = (row.income / maxValue) * 100
          const expensePct = (row.expenses / maxValue) * 100

          return (
            <div
              key={row.date}
              className="flex min-w-[28px] sm:min-w-[36px] flex-1 flex-col items-center justify-end gap-1 group cursor-pointer"
              title={`${row.date} | รับ ฿${row.income.toLocaleString()} | จ่าย ฿${row.expenses.toLocaleString()} | สุทธิ ${net >= 0 ? "+" : ""}฿${net.toLocaleString()}`}
            >
              <div className="flex h-40 w-full items-end justify-center gap-0.5 sm:gap-1 px-0.5">
                {/* Income Bar (Green) */}
                <div
                  className="w-1.5 sm:w-2 rounded-t bg-primary transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: row.income > 0 ? `${Math.max(4, incomePct)}%` : "0%",
                    minHeight: row.income > 0 ? "4px" : "0",
                  }}
                />
                {/* Expense Bar (Rose) */}
                <div
                  className="w-1.5 sm:w-2 rounded-t bg-[#f3727f] transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: row.expenses > 0 ? `${Math.max(4, expensePct)}%` : "0%",
                    minHeight: row.expenses > 0 ? "4px" : "0",
                  }}
                />
              </div>

              {/* Net Text */}
              <span
                className={`text-[10px] font-bold tabular-nums whitespace-nowrap ${
                  net > 0 ? "text-primary" : net < 0 ? "text-[#f3727f]" : "text-spotify-muted"
                }`}
              >
                {net > 0 ? `+${money(net)}` : money(net)}
              </span>

              {/* Day Label */}
              <span className="text-[10px] text-spotify-muted font-medium">
                {row.date.slice(-2)}
              </span>
            </div>
          )
        })}

        {visibleRows.length === 0 && (
          <div className="flex h-48 w-full items-center justify-center text-spotify-muted text-xs">
            ยังไม่มีข้อมูลรับ-จ่ายในเดือนที่เลือก
          </div>
        )}
      </div>
    </section>
  )
}
