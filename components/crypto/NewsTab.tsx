import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Newspaper, Calendar, Clock } from "lucide-react"
import { NewsItem } from "@/types/crypto"

const newsData: NewsItem[] = [
  {
    id: 1,
    title: "Fed เตรียมประกาศดอกเบี้ยใหม่ในสัปดาห์หน้า",
    source: "CoinDesk",
    time: "2 ชั่วโมงที่แล้ว",
    impact: "high",
    category: "Fed",
  },
  {
    id: 2,
    title: "CPI เดือนนี้สูงกว่าคาด ส่งผลต่อตลาด Crypto",
    source: "Bloomberg",
    time: "4 ชั่วโมงที่แล้ว",
    impact: "high",
    category: "CPI",
  },
  {
    id: 3,
    title: "Bitcoin ETF มีการไหลเข้าของเงินทุนเพิ่มขึ้น",
    source: "Reuters",
    time: "6 ชั่วโมงที่แล้ว",
    impact: "medium",
    category: "Bitcoin",
  },
]

export function NewsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-5 h-5" />
          ข่าวสารสำคัญ
        </CardTitle>
        <CardDescription>ข่าวที่ส่งผลต่อตลาด Crypto เช่น Fed, CPI และข่าวเศรษฐกิจ</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {newsData.map((news) => (
            <div
              key={news.id}
              className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">{news.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {news.source}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {news.time}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={news.impact === "high" ? "destructive" : "secondary"}>
                    {news.impact === "high" ? "ผลกระทบสูง" : "ผลกระทบปานกลาง"}
                  </Badge>
                  <Badge variant="outline">{news.category}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}