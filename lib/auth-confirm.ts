import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import { getSiteUrl } from "@/lib/site-url"

const DEFAULT_REDIRECT = "/dashboard"

/**
 * Handles the link Supabase puts in confirmation / recovery emails.
 *
 * Two link shapes are supported so the flow keeps working no matter which email
 * template the project uses:
 *   - `?token_hash=...&type=signup` (recommended — works on any device)
 *   - `?code=...` (PKCE, only works in the browser that started the signup)
 */
export async function handleAuthConfirm(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const siteUrl = await getSiteUrl()
    const next = safeNextPath(searchParams.get("next"))

    // Supabase reports expired / already-used links by redirecting back with an error.
    const errorDescription = searchParams.get("error_description") ?? searchParams.get("error")
    if (errorDescription) {
        return redirectWithError(siteUrl, errorDescription)
    }

    const tokenHash = searchParams.get("token_hash")
    const type = searchParams.get("type") as EmailOtpType | null
    const code = searchParams.get("code")

    const supabase = await createClient()

    if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        if (error) {
            return redirectWithError(siteUrl, error.message)
        }
        return NextResponse.redirect(`${siteUrl}${next}`)
    }

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
            return redirectWithError(siteUrl, error.message)
        }
        return NextResponse.redirect(`${siteUrl}${next}`)
    }

    return redirectWithError(siteUrl, "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว")
}

/** Only allow same-site paths so the `next` param can't be used as an open redirect. */
function safeNextPath(value: string | null): string {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return DEFAULT_REDIRECT
    }
    return value
}

function redirectWithError(siteUrl: string, message: string) {
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(message)}`)
}
