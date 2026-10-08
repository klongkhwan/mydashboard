"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createWealthCategory, createWealthInvestment, createWealthTransaction } from "@/app/dashboard/my-wealth/actions"

type Category = { id: string; name: string; type: "income" | "expense"; is_active: boolean }

export function MyWealthQuickActions({ categories, allowedModes = ["income", "expense", "investment", "category"] }: { categories: Category[]; allowedModes?: Array<"income" | "expense" | "investment" | "category"> }) {
  const [mode, setMode] = useState<"income" | "expense" | "investment" | "category" | null>(null)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [investmentType, setInvestmentType] = useState("thai_stock")
  const activeCategories = categories.filter((category) => category.is_active)

  function submitTransaction(formData: FormData, type: "income" | "expense") {
    setMessage(null)
    startTransition(async () => {
      try {
        await createWealthTransaction({
          type,
          transaction_date: formData.get("transaction_date"),
          amount_thb: formData.get("amount_thb"),
          category_id: formData.get("category_id"),
          merchant_or_payer: formData.get("merchant_or_payer"),
          description: formData.get("description"),
          payment_status: type === "expense" ? formData.get("payment_status") : "paid",
        })
        setMode(null)
        setMessage("Transaction recorded successfully")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to record transaction")
      }
    })
  }

  function submitInvestment(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      try {
        await createWealthInvestment({
          platform: formData.get("platform"),
          investment_type: formData.get("investment_type"),
          asset_symbol: formData.get("asset_symbol"),
          opened_amount_thb: formData.get("opened_amount_thb"),
          opened_at: formData.get("opened_at"),
          quantity: formData.get("quantity") || undefined,
          entry_price: formData.get("entry_price") || undefined,
          entry_fee_thb: formData.get("entry_fee_thb") || 0,
          note: formData.get("note"),
          dual_strategy: formData.get("dual_strategy") || undefined,
          deposit_asset: formData.get("deposit_asset") || undefined,
          deposit_amount: formData.get("deposit_amount") || undefined,
          target_price: formData.get("target_price") || undefined,
          apr_percent: formData.get("apr_percent") || undefined,
          term_days: formData.get("term_days") || undefined,
          settlement_date: formData.get("settlement_date") || undefined,
        })
        setMode(null)
        setMessage("Investment recorded successfully")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to record investment")
      }
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  function submitCategory(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      try {
        await createWealthCategory({
          name: formData.get("name"),
          type: formData.get("type"),
        })
        setMode(null)
        setMessage("Category created successfully")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to create category")
      }
    })
  }

  const categoryType = mode === "income" ? "income" : "expense"

  const dialogTitle =
    mode === "income"
      ? "Add Income"
      : mode === "expense"
      ? "Add Expense"
      : mode === "investment"
      ? "Add Investment"
      : "Add Category"

  const dialogDescription =
    mode === "income"
      ? "Record your income and cash inflows"
      : mode === "expense"
      ? "Record your expenses and cash outflows"
      : mode === "investment"
      ? "Record your investment entries and assets"
      : "Create a new category to organize transactions"

  const fieldClass = "h-12 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-primary focus:bg-white/[0.09] focus:ring-2 focus:ring-primary/20"
  const footerClass = "mt-2 border-t border-white/10 pt-5"

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {allowedModes.includes("income") && (
          <Button className="btn-pill-primary text-xs" onClick={() => setMode("income")}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Income
          </Button>
        )}
        {allowedModes.includes("expense") && (
          <Button className="btn-pill-primary text-xs" onClick={() => setMode("expense")}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Expense
          </Button>
        )}
        {allowedModes.includes("investment") && (
          <Button className="btn-pill-primary text-xs" onClick={() => setMode("investment")}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Investment
          </Button>
        )}
        {allowedModes.includes("category") && (
          <Button className="btn-pill-primary text-xs" onClick={() => setMode("category")}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        )}
      </div>
      {message && <p className="text-xs text-primary">{message}</p>}

      <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 py-6 pr-14">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {(mode === "income" || mode === "expense") && (
            <form action={(formData) => submitTransaction(formData, mode)} className="grid gap-4 px-6 pb-6 pt-5 md:grid-cols-2">
              <input type="date" name="transaction_date" required defaultValue={today} className={fieldClass} />
              <input type="number" name="amount_thb" required min="0.01" step="0.01" placeholder="Amount (THB)" className={fieldClass} />
              <Select name="category_id" required>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.filter((category) => category.type === categoryType).map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input name="merchant_or_payer" placeholder={mode === "income" ? "Payer / Source" : "Merchant / Payee"} className={fieldClass} />
              <input name="description" placeholder="Description" className={fieldClass} />
              {mode === "expense" && (
                <Select name="payment_status" defaultValue="paid">
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <DialogFooter className={`md:col-span-2 ${footerClass}`}>
                <Button type="button" variant="ghost" className="h-11 rounded-xl px-5 text-white/65 hover:bg-white/10 hover:text-white" onClick={() => setMode(null)}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-xl bg-primary px-6 font-semibold text-black shadow-lg shadow-primary/20 hover:bg-primary/90" disabled={pending}>Save</Button>
              </DialogFooter>
            </form>
          )}

          {mode === "category" && (
            <form action={submitCategory} className="grid gap-4 px-6 pb-6 pt-5 md:grid-cols-2">
              <input name="name" required placeholder="Category Name" className={fieldClass} />
              <Select name="type" defaultValue="expense">
                <SelectTrigger className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter className={`md:col-span-2 ${footerClass}`}>
                <Button type="button" variant="ghost" className="h-11 rounded-xl px-5 text-white/65 hover:bg-white/10 hover:text-white" onClick={() => setMode(null)}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-xl bg-primary px-6 font-semibold text-black shadow-lg shadow-primary/20 hover:bg-primary/90" disabled={pending}>Create Category</Button>
              </DialogFooter>
            </form>
          )}

          {mode === "investment" && (
            <form action={submitInvestment} className="grid gap-4 px-6 pb-6 pt-5 md:grid-cols-2">
              <Select name="platform" defaultValue="dime">
                <SelectTrigger className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dime">Dime</SelectItem>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="binance_th">Binance TH</SelectItem>
                </SelectContent>
              </Select>
              <Select name="investment_type" value={investmentType} onValueChange={setInvestmentType}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thai_stock">Thai Stock</SelectItem>
                  <SelectItem value="foreign_stock">Foreign Stock</SelectItem>
                  <SelectItem value="spot_trade">Spot Trade</SelectItem>
                  <SelectItem value="futures_trade">Futures Trade</SelectItem>
                  <SelectItem value="crypto_holding">Crypto Holding</SelectItem>
                  <SelectItem value="dual_asset">Dual Investment</SelectItem>
                </SelectContent>
              </Select>
              <input name="asset_symbol" required placeholder="Asset Symbol (e.g. AAPL, BTC/USDT)" className={fieldClass} />
              <input type="number" name="opened_amount_thb" required min="0.01" step="0.01" placeholder="Invested Amount (THB)" className={fieldClass} />
              <input type="date" name="opened_at" required defaultValue={today} className={fieldClass} />
              <input type="number" name="quantity" min="0" step="any" placeholder="Quantity (Optional)" className={fieldClass} />
              <input type="number" name="entry_price" min="0" step="any" placeholder="Entry Price (Optional)" className={fieldClass} />
              <input type="number" name="entry_fee_thb" min="0" step="0.01" placeholder="Fee (THB)" className={fieldClass} />
              {investmentType === "dual_asset" && (
                <>
                  <Select name="dual_strategy" required>
                    <SelectTrigger className={fieldClass}>
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy_low">Buy Low</SelectItem>
                      <SelectItem value="sell_high">Sell High</SelectItem>
                    </SelectContent>
                  </Select>
                  <input name="deposit_asset" required placeholder="Deposit Asset (e.g. USDT)" className={fieldClass} />
                  <input type="number" name="deposit_amount" required min="0.00000001" step="any" placeholder="Deposit Amount" className={fieldClass} />
                  <input type="number" name="target_price" required min="0.00000001" step="any" placeholder="Target Price" className={fieldClass} />
                  <input type="number" name="apr_percent" required min="0" step="0.0001" placeholder="APR %" className={fieldClass} />
                  <input type="number" name="term_days" required min="1" step="1" placeholder="Term (Days)" className={fieldClass} />
                  <input type="date" name="settlement_date" required className={fieldClass} />
                </>
              )}
              <textarea name="note" placeholder="Note (Optional)" className={`${fieldClass} h-24 py-3 md:col-span-2`} />
              <DialogFooter className={`md:col-span-2 ${footerClass}`}>
                <Button type="button" variant="ghost" className="h-11 rounded-xl px-5 text-white/65 hover:bg-white/10 hover:text-white" onClick={() => setMode(null)}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-xl bg-primary px-6 font-semibold text-black shadow-lg shadow-primary/20 hover:bg-primary/90" disabled={pending}>Save Investment</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
