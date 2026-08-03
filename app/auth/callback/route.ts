import type { NextRequest } from "next/server"
import { handleAuthConfirm } from "@/lib/auth-confirm"

/** Alias of /auth/confirm, kept so either URL can be used in the Supabase redirect allow list. */
export async function GET(request: NextRequest) {
    return handleAuthConfirm(request)
}
