import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Activity, Eye } from "lucide-react"

const analyticsData = [
  { metric: "Page Views", value: "45,231", change: "+12%", trend: "up" },
  { metric: "Unique Visitors", value: "12,543", change: "+8%", trend: "up" },
  { metric: "Bounce Rate", value: "34.2%", change: "-5%", trend: "down" },
  { metric: "Session Duration", value: "4m 32s", change: "+15%", trend: "up" },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-balance">Analytics</h2>
        <p className="text-muted-foreground">Track your website performance and user behavior</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analyticsData.map((data) => (
          <Card key={data.metric} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{data.metric}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.value}</div>
              <p className={`text-xs ${data.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                {data.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Traffic Overview
            </CardTitle>
            <CardDescription>Website traffic trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-time Activity
            </CardTitle>
            <CardDescription>Current user activity on your site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-sm">User viewed homepage</p>
                    <p className="text-xs text-muted-foreground">{i} seconds ago</p>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
