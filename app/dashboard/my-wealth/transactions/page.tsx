import { Suspense } from "react"
import { TransactionsView } from "@/components/my-wealth/transactions-view"

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-spotify-muted">กำลังโหลดรายการเงิน...</div>}>
      <TransactionsView />
    </Suspense>
  )
}
