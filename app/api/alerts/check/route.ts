import { NextRequest, NextResponse } from "next/server"
import { checkActivePriceAlerts } from "@/lib/alert-checker"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const result = await checkActivePriceAlerts()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (err: any) {
    console.error("Alerts check route error:", err)
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 })
  }
}
