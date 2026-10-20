import { redirect } from "next/navigation"

export default function CategoriesPage() {
  redirect("/dashboard/my-wealth/transactions?manageCategories=true")
}
