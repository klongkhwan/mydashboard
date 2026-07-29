import { NextResponse } from "next/server"

// TradingView's own symbol index — the same source that backs the embedded widgets,
// so anything returned here is guaranteed to render in them.
const searchEndpoint = "https://symbol-search.tradingview.com/symbol_search/v3/"

// The endpoint rejects requests that don't look like they came from tradingview.com.
const upstreamHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Origin: "https://www.tradingview.com",
  Referer: "https://www.tradingview.com/",
}

interface UpstreamSymbol {
  symbol?: string
  description?: string
  exchange?: string
  type?: string
  country?: string
  currency_code?: string
}

// Matches are wrapped in <em> to highlight the query; we render plain text.
const stripHighlight = (value: string | undefined) => (value ?? "").replace(/<\/?em>/g, "")

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(Number(searchParams.get("limit")) || 5, 20)
  if (query.length < 1) return NextResponse.json({ results: [] })

  const url = new URL(searchEndpoint)
  url.searchParams.set("text", query)
  url.searchParams.set("hl", "1")
  url.searchParams.set("lang", "en")
  url.searchParams.set("domain", "production")
  url.searchParams.set("sort_by_country", "US")

  try {
    const response = await fetch(url, { headers: upstreamHeaders, next: { revalidate: 3600 } })
    if (!response.ok) return NextResponse.json({ results: [], error: `Symbol search failed (${response.status})` }, { status: 502 })

    const payload = (await response.json()) as { symbols?: UpstreamSymbol[] }
    const results = (payload.symbols ?? []).slice(0, limit).map((item) => {
      const symbol = stripHighlight(item.symbol)
      const exchange = stripHighlight(item.exchange)
      return {
        symbol,
        exchange,
        // What the widgets expect, and what we store in the watchlist.
        value: exchange ? `${exchange}:${symbol}` : symbol,
        description: stripHighlight(item.description),
        type: item.type ?? "",
        currency: item.currency_code ?? "",
      }
    })
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [], error: "Symbol search is unavailable" }, { status: 502 })
  }
}
