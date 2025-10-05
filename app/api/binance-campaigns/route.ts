import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const pageNo = Number(url.searchParams.get("pageNo") ?? "1")

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
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: "proxy-failed", detail: String(e?.message || e) }, { status: 500 })
  }
}
