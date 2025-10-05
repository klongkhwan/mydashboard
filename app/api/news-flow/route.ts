import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    // สร้าง upstream URL (ถ้าคลายอยากเปลี่ยน filter ให้ส่งผ่าน query มาก็ได้)
    const upstream = new URL("https://news-mediator.tradingview.com/news-flow/v2/news")

    // ค่าตั้งต้น (ตามที่แจ้ง)
    if (!url.searchParams.has("filter")) {
      upstream.searchParams.append("filter", "lang:en")
      upstream.searchParams.append("filter", "market:crypto,economic,etf,index,options")
    } else {
      // forward ทุก filter ซ้ำได้หลายค่า
      url.searchParams.getAll("filter").forEach((f) => upstream.searchParams.append("filter", f))
    }
    upstream.searchParams.set("client", url.searchParams.get("client") || "screener")
    upstream.searchParams.set("streaming", url.searchParams.get("streaming") || "true")

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
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: "proxy-failed", detail: String(e?.message || e) }, { status: 500 })
  }
}
