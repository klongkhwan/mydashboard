/**
 * Email Service for Price Alerts
 * Uses native fetch to send transactional emails via Resend API or logs simulated emails in dev mode.
 * Zero extra dependencies required.
 */

export interface PriceAlertEmailPayload {
  to: string
  symbol: string
  targetPrice: number
  currentPrice: number
  condition: "crosses_above" | "crosses_below" | "greater_than" | "less_than"
  note?: string
  siteUrl?: string
}

function buildAlertEmailHtml(payload: PriceAlertEmailPayload): string {
  const isUp = payload.condition.includes("above") || payload.condition === "greater_than"
  const conditionLabel = isUp ? "พุ่งแตะระดับบน (Crossed Above)" : "ร่วงแตะระดับล่าง (Crossed Below)"
  const conditionColor = isUp ? "#089981" : "#f23645"
  const formattedTarget = payload.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formattedCurrent = payload.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const timestamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
  const chartUrl = `${payload.siteUrl || "http://localhost:3000"}/dashboard/investment/chart?symbol=${payload.symbol}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚨 Price Alert: ${payload.symbol}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #d1d4dc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0e14; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #131722; border-radius: 16px; border: 1px solid #2a2e39; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(41,98,255,0.2) 0%, rgba(139,92,246,0.1) 100%); padding: 24px 32px; border-bottom: 1px solid #2a2e39;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: ${conditionColor}22; color: ${conditionColor}; border: 1px solid ${conditionColor}44; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
                      🚨 แจ้งเตือนราคาทำงานแล้ว
                    </span>
                    <h1 style="margin: 12px 0 4px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      ${payload.symbol}
                    </h1>
                    <p style="margin: 0; font-size: 13px; color: #787b86;">
                      ${conditionLabel}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Price Stats Card -->
          <tr>
            <td style="padding: 32px;">
              <div style="background-color: #1e222d; border-radius: 12px; border: 1px solid #2a2e39; padding: 20px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%" style="padding-right: 12px; border-right: 1px solid #2a2e39;">
                      <span style="font-size: 11px; color: #787b86; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">ราคาเป้าหมาย</span>
                      <span style="font-family: monospace; font-size: 20px; font-weight: 700; color: #ffffff;">$${formattedTarget}</span>
                    </td>
                    <td width="50%" style="padding-left: 20px;">
                      <span style="font-size: 11px; color: #787b86; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">ราคาที่กระตุ้น</span>
                      <span style="font-family: monospace; font-size: 20px; font-weight: 700; color: ${conditionColor};">$${formattedCurrent}</span>
                    </td>
                  </tr>
                </table>
              </div>

              ${payload.note ? `
              <!-- Note if available -->
              <div style="background-color: #1a202c; border-left: 3px solid #2962ff; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                <span style="font-size: 11px; color: #787b86; display: block; margin-bottom: 2px;">บันทึกของคุณ:</span>
                <span style="font-size: 13px; color: #e2e8f0;">${payload.note}</span>
              </div>
              ` : ''}

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
                <tr>
                  <td align="center">
                    <a href="${chartUrl}" target="_blank" style="display: inline-block; background-color: #2962ff; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(41,98,255,0.4);">
                      เปิดดูกราฟสดทันที &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #11141c; padding: 20px 32px; border-top: 1px solid #2a2e39; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #787b86;">
                ส่งแจ้งเตือนเมื่อ: ${timestamp} (UTC+7)
              </p>
              <p style="margin: 0; font-size: 11px; color: #4a5060;">
                SuperlBoard Pro Investment Chart &middot; Binance Public Feed
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

export async function sendPriceAlertEmail(payload: PriceAlertEmailPayload): Promise<{
  success: boolean
  error?: string
  simulated?: boolean
}> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM || "SuperlBoard Alerts <onboarding@resend.dev>"
    const html = buildAlertEmailHtml(payload)

    // Optional webhook forwarding (e.g. Discord, Telegram or Custom Service)
    const webhookUrl = process.env.ALERT_WEBHOOK_URL
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "price_alert",
            symbol: payload.symbol,
            target_price: payload.targetPrice,
            current_price: payload.currentPrice,
            condition: payload.condition,
            email: payload.to,
            note: payload.note,
          }),
        })
      } catch (webhookErr) {
        console.warn("Alert webhook failed", webhookErr)
      }
    }

    // 1. If RESEND_API_KEY is configured, dispatch real email
    if (apiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: `🚨 [Alert] ${payload.symbol} แตะ $${payload.targetPrice.toLocaleString()} เรียบร้อยแล้ว`,
          html,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const errorMsg = errData.message || `Resend failed with status ${res.status}`
        console.error("Resend API error:", errorMsg)
        return { success: false, error: errorMsg }
      }

      return { success: true }
    }

    // 2. Simulated/Development Mode:
    // When RESEND_API_KEY is not yet defined, log clearly and return success so testing works seamlessly.
    console.log(
      `\n======================================================\n` +
      `[PRICE ALERT EMAIL (DEV/SIMULATED)]\n` +
      `To: ${payload.to}\n` +
      `Symbol: ${payload.symbol} | Target: $${payload.targetPrice} | Current: $${payload.currentPrice}\n` +
      `Condition: ${payload.condition}\n` +
      `Note: ${payload.note || "None"}\n` +
      `Tip: Add RESEND_API_KEY in .env.local to deliver to real inboxes.\n` +
      `======================================================\n`
    )

    return { success: true, simulated: true }
  } catch (err: any) {
    console.error("sendPriceAlertEmail failed:", err)
    return { success: false, error: err?.message || "Failed to send email" }
  }
}
