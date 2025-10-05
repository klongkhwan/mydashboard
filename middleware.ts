import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page
  if (pathname === "/login") {
    return NextResponse.next()
  }

  // Check for auth token in cookies or headers
  const authToken = request.cookies.get("auth-token")?.value

  // Redirect to login if not authenticated and trying to access protected routes
  if (pathname.startsWith("/dashboard") && !authToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
