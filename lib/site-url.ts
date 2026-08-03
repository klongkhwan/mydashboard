import { headers } from "next/headers"

/**
 * Base URL to use when building links that leave the app and come back later
 * (email confirmation, password reset). Without this, Supabase falls back to the
 * "Site URL" configured in the dashboard — which is why those links kept landing
 * on localhost.
 *
 * Resolution order: NEXT_PUBLIC_SITE_URL -> the host of the incoming request ->
 * Vercel-provided host -> localhost.
 */
export async function getSiteUrl(): Promise<string> {
    const configured = process.env.NEXT_PUBLIC_SITE_URL
    if (configured) return normalizeUrl(configured)

    try {
        const requestHeaders = await headers()
        const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")

        if (host) {
            const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1")
            const proto = requestHeaders.get("x-forwarded-proto") ?? (isLocal ? "http" : "https")
            return normalizeUrl(`${proto}://${host}`)
        }
    } catch {
        // Called outside a request context (build step, script) — fall through.
    }

    const vercelHost =
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
    if (vercelHost) return normalizeUrl(vercelHost)

    return "http://localhost:3000"
}

/** Adds a scheme when missing and strips trailing slashes so paths can be appended. */
function normalizeUrl(url: string): string {
    const withScheme = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`
    return withScheme.replace(/\/+$/, "")
}
