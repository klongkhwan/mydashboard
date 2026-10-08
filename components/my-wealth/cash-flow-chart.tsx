"use client"

type CashFlowRow = { date: string; income: number; expenses: number; investmentOut: number; investmentIn: number }

const money = (value: number) => new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value)

export function MyWealthCashFlowChart({ rows }: { rows: CashFlowRow[] }) {
  const visibleRows = [...rows].sort((left, right) => left.date.localeCompare(right.date))
  const maxValue = Math.max(1, ...visibleRows.flatMap((row) => [row.income, row.expenses + row.investmentOut, row.investmentIn]))

  return <section className="card-spotify p-6 space-y-4">
    <div><h2 className="text-xl font-bold">กราฟกระแสเงินรายวัน</h2><p className="text-spotify-muted mt-1 text-sm">เขียว: รายรับ · แดง: จ่ายและลงทุน · ฟ้า: เงินรับกลับ</p></div>
    <div className="flex h-56 items-end gap-2 overflow-x-auto pb-6">
      {visibleRows.map((row) => {
        const outgoing = row.expenses + row.investmentOut
        const net = row.income - outgoing + row.investmentIn
        return <div key={row.date} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-1" title={row.date + " | สุทธิ " + money(net)}>
          <div className="flex h-44 items-end gap-1"><div className="w-2 rounded-t bg-primary" style={{ height: (row.income / maxValue) * 100 + "%" }} /><div className="w-2 rounded-t bg-red-400" style={{ height: (outgoing / maxValue) * 100 + "%" }} /><div className="w-2 rounded-t bg-sky-400" style={{ height: (row.investmentIn / maxValue) * 100 + "%" }} /></div>
          <span className={net >= 0 ? "text-xs text-primary" : "text-xs text-red-400"}>{money(net)}</span><span className="text-xs text-spotify-muted">{row.date.slice(-2)}</span>
        </div>
      })}
      {visibleRows.length === 0 && <p className="text-spotify-muted">ยังไม่มีข้อมูลในเดือนที่เลือก</p>}
    </div>
  </section>
}