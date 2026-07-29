/**
 * Role helpers shared by client and server code, so this file must stay free of
 * server-only imports.
 *
 * Roles are stored lowercase in `profiles.role` (see supabase/setup_db.sql), but
 * rows seeded by hand sometimes use other casing — compare case-insensitively.
 */
export const ADMIN_ROLE = "admin"

export function isAdminRole(role?: string | null) {
    return typeof role === "string" && role.trim().toLowerCase() === ADMIN_ROLE
}
