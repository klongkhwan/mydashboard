import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, TrendingUp, Star } from "lucide-react"
import { ScannerResult, ScannerFilters } from "@/types/crypto"

const scannerResults: ScannerResult[] = [
  {
    symbol: "MATIC",
    name: "Polygon",
    price: 0.85,
    change: 15.2,
    volume: "850M",
    score: 8.5,
    reason: "High volume breakout",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    price: 14.25,
    change: 8.7,
    volume: "1.2B",
    score: 7.8,
    reason: "Technical pattern",
  },
  { symbol: "DOT", name: "Polkadot", price: 6.45, change: 12.3, volume: "680M", score: 7.2, reason: "News catalyst" },
]

interface ScannerTabProps {
  filters: ScannerFilters
  setFilters: (filters: ScannerFilters) => void
}

export function ScannerTab({ filters, setFilters }: ScannerTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Crypto Scanner
        </CardTitle>
        <CardDescription>ค้นหาและกรองเหรียญ Crypto ที่เข้าเงื่อนไขการลงทุน</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">ราคาต่ำสุด</label>
            <Input
              placeholder="0.00"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">ราคาสูงสุด</label>
            <Input
              placeholder="1000.00"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Volume ขั้นต่ำ</label>
            <Input
              placeholder="1M"
              value={filters.minVolume}
              onChange={(e) => setFilters({ ...filters, minVolume: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">หมวดหมู่</label>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="defi">DeFi</SelectItem>
                <SelectItem value="layer1">Layer 1</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {scannerResults.map((coin) => (
            <div key={coin.symbol} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">{coin.symbol}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{coin.name}</h3>
                    <p className="text-sm text-muted-foreground">{coin.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${coin.price}</p>
                    <p className="text-sm text-muted-foreground">Vol: {coin.volume}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-500">
                      <TrendingUp className="w-3 h-3" />+{coin.change}%
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {coin.score}/10
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}