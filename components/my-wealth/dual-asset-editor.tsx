"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { updateWealthInvestment } from "@/app/dashboard/my-wealth/actions"

export function DualAssetEditor({ investment, onDone }: { investment: any; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  return <form action={(formData) => startTransition(async () => {
    await updateWealthInvestment(investment.id, {
      platform: investment.platform,
      investment_type: "dual_asset",
      asset_symbol: String(formData.get("asset_symbol")),
      opened_amount_thb: formData.get("opened_amount_thb"),
      opened_at: String(formData.get("opened_at")),
      quantity: formData.get("quantity") || undefined,
      entry_price: formData.get("entry_price") || undefined,
      entry_fee_thb: formData.get("entry_fee_thb") || 0,
      note: formData.get("note") || undefined,
      dual_strategy: formData.get("dual_strategy"),
      deposit_asset: formData.get("deposit_asset") || undefined,
      deposit_amount: formData.get("deposit_amount") || undefined,
      target_price: formData.get("target_price") || undefined,
      apr_percent: formData.get("apr_percent") || undefined,
      term_days: formData.get("term_days") || undefined,
      settlement_date: formData.get("settlement_date") || undefined,
    })
    onDone()
  })} className="card-spotify p-6 space-y-4 xl:col-span-2">
    <h2 className="text-xl font-bold">แก้ไข Dual Asset · {investment.asset_symbol}</h2>
    <div className="grid gap-3 md:grid-cols-3">
      <select name="dual_strategy" defaultValue={investment.dual_strategy || "buy_low"} className="rounded-md bg-background p-2"><option value="buy_low">Buy Low</option><option value="sell_high">Sell High</option></select>
      <input name="asset_symbol" required defaultValue={investment.asset_symbol} placeholder="สินทรัพย์" className="rounded-md bg-background p-2" />
      <input name="opened_amount_thb" required type="number" min="0.01" step="0.01" defaultValue={investment.opened_amount_thb} placeholder="เงินลงทุน (บาท)" className="rounded-md bg-background p-2" />
      <input name="opened_at" required type="date" defaultValue={investment.opened_at} className="rounded-md bg-background p-2" />
      <input name="deposit_asset" required defaultValue={investment.deposit_asset || ""} placeholder="เหรียญที่ฝาก" className="rounded-md bg-background p-2" />
      <input name="deposit_amount" required type="number" min="0.00000001" step="any" defaultValue={investment.deposit_amount || ""} placeholder="จำนวนฝาก" className="rounded-md bg-background p-2" />
      <input name="target_price" required type="number" min="0.00000001" step="any" defaultValue={investment.target_price || ""} placeholder="Target Price" className="rounded-md bg-background p-2" />
      <input name="apr_percent" required type="number" min="0" step="0.0001" defaultValue={investment.apr_percent || ""} placeholder="APR %" className="rounded-md bg-background p-2" />
      <input name="term_days" required type="number" min="1" step="1" defaultValue={investment.term_days || ""} placeholder="ระยะเวลา (วัน)" className="rounded-md bg-background p-2" />
      <input name="settlement_date" required type="date" defaultValue={investment.settlement_date || ""} className="rounded-md bg-background p-2" />
      <input name="quantity" type="number" step="any" defaultValue={investment.quantity || ""} placeholder="จำนวน (ถ้ามี)" className="rounded-md bg-background p-2" />
      <input name="entry_price" type="number" step="any" defaultValue={investment.entry_price || ""} placeholder="ราคาเข้า (ถ้ามี)" className="rounded-md bg-background p-2" />
      <input name="entry_fee_thb" type="number" min="0" step="0.01" defaultValue={investment.entry_fee_thb || 0} placeholder="ค่าธรรมเนียม" className="rounded-md bg-background p-2" />
      <input name="note" defaultValue={investment.note || ""} placeholder="หมายเหตุ" className="rounded-md bg-background p-2 md:col-span-3" />
    </div>
    <div className="flex gap-2"><Button type="submit" disabled={pending}>บันทึก Dual Asset</Button><Button type="button" variant="ghost" onClick={onDone}>ยกเลิก</Button></div>
  </form>
}