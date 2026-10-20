import { redirect } from "next/navigation"

export default function IncomePage() {
  redirect("/dashboard/my-wealth/transactions?filter=income")
}
