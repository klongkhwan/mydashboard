import { Loading } from "@/components/ui/loading"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center h-screen">
        <Loading
          size="xl"
          text="กำลังโหลดแดชบอร์ด..."
          variant="dots"
        />
      </div>
    </div>
  )
}