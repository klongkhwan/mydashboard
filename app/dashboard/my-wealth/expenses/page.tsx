import { redirect } from "next/navigation"

export default function ExpensesPage() {
  redirect("/dashboard/my-wealth/transactions?filter=expenses")
}
