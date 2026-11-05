import { getDashboardData } from "./actions"
import { DashboardView } from "@/components/dashboard/dashboard-view"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { userName, summary, errors, usdThbRate } = await getDashboardData()

  return (
    <DashboardView
      userName={userName}
      summary={summary}
      errors={errors}
      usdThbRate={usdThbRate}
    />
  )
}
