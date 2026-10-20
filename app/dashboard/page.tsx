import { getDashboardData } from "./actions"
import { DashboardView } from "@/components/dashboard/dashboard-view"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { userName, generatedAt, summary, errors, usdThbRate } = await getDashboardData()

  return (
    <DashboardView
      userName={userName}
      generatedAt={generatedAt}
      summary={summary}
      errors={errors}
      usdThbRate={usdThbRate}
    />
  )
}
