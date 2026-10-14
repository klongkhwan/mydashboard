import { NextResponse } from "next/server"

interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 120 * 1000 // 120 seconds

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const pageNo = Number(url.searchParams.get("pageNo") ?? "1")
    const cacheKey = `page_${pageNo}`

    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "X-Cache": "HIT",
        },
      })
    }

    const upstream = "https://www.binance.th/bapi/composite/v1/friendly/marketing/campaign/queryCampaignLangInfos"

    const res = await fetch(upstream, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "lang": "th",
        "origin": "https://www.binance.th",
      },
      body: JSON.stringify({ pageNo }),
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Upstream ${res.status}`, detail: text }, { status: res.status })
    }

    const data = await res.json()
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: "proxy-failed", detail: String(e?.message || e) }, { status: 500 })
  }
}
