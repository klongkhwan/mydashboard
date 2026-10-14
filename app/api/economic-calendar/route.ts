import { NextResponse } from "next/server"

interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const countries = searchParams.get("countries") // ค่าที่ส่งมาเช่น "US,EU,JP"

    if (!from || !to || !countries) {
      return NextResponse.json(
        { error: "Missing required query params: from, to, countries" },
        { status: 400 }
      )
    }

    const cacheKey = `${from}_${to}_${countries}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "X-Cache": "HIT",
        },
      })
    }

    const upstream = new URL("https://economic-calendar.tradingview.com/events")
    upstream.searchParams.set("from", from)
    upstream.searchParams.set("to", to)
    upstream.searchParams.set("countries", countries)

    const res = await fetch(upstream.toString(), {
      // สำคัญ: ใส่ origin เป็น tradingview (ฝั่ง server เท่านั้นถึงตั้งได้)
      headers: { origin: "https://th.tradingview.com" },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Store in cache
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) cache.delete(oldestKey)
    }
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "MISS",
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Proxy failed", detail: String(err?.message || err) },
      { status: 500 }
    )
  }
}
