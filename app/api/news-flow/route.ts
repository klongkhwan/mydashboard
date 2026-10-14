import { NextResponse } from "next/server"

interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const cacheKey = url.searchParams.toString() || "default"

    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "X-Cache": "HIT",
        },
      })
    }

    // สร้าง upstream URL (ถ้าคลายอยากเปลี่ยน filter ให้ส่งผ่าน query มาก็ได้)
    const upstream = new URL("https://news-mediator.tradingview.com/news-flow/v2/news")

    // ค่าตั้งต้น (ตามที่แจ้ง)
    if (!url.searchParams.has("filter")) {
      upstream.searchParams.append("filter", "lang:en")
      upstream.searchParams.append("filter", "market:crypto")
    } else {
      // forward ทุก filter ซ้ำได้หลายค่า
      url.searchParams.getAll("filter").forEach((f) => upstream.searchParams.append("filter", f))
    }
    upstream.searchParams.set("client", url.searchParams.get("client") || "overview")
    upstream.searchParams.set("streaming", url.searchParams.get("streaming") || "false")
    upstream.searchParams.set("user_prostatus", url.searchParams.get("user_prostatus") || "non_pro")

    const res = await fetch(upstream.toString(), {
      headers: { origin: "https://www.tradingview.com" },
      cache: "no-store",
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `Upstream ${res.status}`, detail: t }, { status: res.status })
    }

    const data = await res.json()
    // slice เฉพาะ 0–99
    if (Array.isArray(data?.items)) {
      data.items = data.items.slice(0, 100)
    }

    if (cache.size > 50) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "MISS",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy-failed", detail: String(e?.message || e) }, { status: 500 })
  }
}
