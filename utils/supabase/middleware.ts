import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Video-editor endpoints that touch the filesystem or spawn FFmpeg. */
const MEDIA_API_PREFIXES = ['/api/video', '/api/export', '/api/transcribe']

/** Public market data endpoints that do not require user session validation */
const PUBLIC_API_PREFIXES = [
    '/api/economic-calendar',
    '/api/news-flow',
    '/api/news-story',
    '/api/binance-campaigns',
    '/api/binance',
    '/api/crypto-prices',
    '/api/dual-investment',
    '/api/stocks',
]

export async function updateSession(request: NextRequest) {
    // Fast path: bypass auth check for public market data proxy APIs
    if (PUBLIC_API_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create a Supabase client to manage the session
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Update the cookies in the request (so Server Components see them)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )

                    // Update the cookies in the response (so the browser sees them)
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // This will refresh the session if needed
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Middleware Security: Protect the media APIs. These read and write files under
    // tmp/ and spawn FFmpeg jobs, so they must never be reachable without a session.
    // Answer with 401 instead of a redirect — the callers are fetch(), not navigations.
    if (!user && MEDIA_API_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
        return NextResponse.json({ success: false, error: 'ต้องเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 })
    }

    // Middleware Security: Protect the dashboard
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect to dashboard if logged in and trying to access login/register
    if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
