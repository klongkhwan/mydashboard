import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const lang = searchParams.get("lang") || "en"
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

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
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: "proxy-failed", detail: String(e?.message || e) }, { status: 500 })
  }
}
