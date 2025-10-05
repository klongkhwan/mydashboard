import { NextResponse } from "next/server"

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

    const upstream = new URL("https://economic-calendar.tradingview.com/events")
    upstream.searchParams.set("from", from)
    upstream.searchParams.set("to", to)
    upstream.searchParams.set("countries", countries)

    const res = await fetch(upstream.toString(), {
      // สำคัญ: ใส่ origin เป็น tradingview (ฝั่ง server เท่านั้นถึงตั้งได้)
      headers: { origin: "https://th.tradingview.com" },
      // ปรับ timeout ตามต้องการ
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
    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Proxy failed", detail: String(err?.message || err) },
      { status: 500 }
    )
  }
}
