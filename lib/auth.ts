import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { isAdminRole } from "@/lib/roles"

export { ADMIN_ROLE, isAdminRole } from "@/lib/roles"

/**
 * Reads the signed-in user together with the role stored on their profile row.
 * Returns nulls when there is no session, so callers can decide how to react.
 */
export async function getUserWithRole() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, role: null }
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    return { user, role: (profile?.role as string | null) ?? null }
}

export async function isAdmin() {
    const { role } = await getUserWithRole()
    return isAdminRole(role)
}

/**
 * Guard for route handlers. When `error` is set, return it straight away;
 * otherwise `user` is the authenticated admin making the request.
 */
export async function requireAdminApi(): Promise<
    { error: NextResponse; user: null } | { error: null; user: User }
> {
    const { user, role } = await getUserWithRole()

    if (!user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
    }

    if (!isAdminRole(role)) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null }
    }

    return { error: null, user }
}
