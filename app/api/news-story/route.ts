import { NextResponse } from "next/server"

interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const lang = searchParams.get("lang") || "en"
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const cacheKey = `${id}_${lang}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
          "X-Cache": "HIT",
        },
      })
    }

    const upstream = new URL("https://news-headlines.tradingview.com/v3/story")
    upstream.searchParams.set("id", id)
    upstream.searchParams.set("lang", lang)

    const res = await fetch(upstream.toString(), {
      headers: { origin: "https://www.tradingview.com" },
      cache: "no-store",
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `Upstream ${res.status}`, detail: t }, { status: res.status })
    }
    const data = await res.json()

    if (cache.size > 200) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        "X-Cache": "MISS",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy-failed", detail: String(e?.message || e) }, { status: 500 })
  }
}
