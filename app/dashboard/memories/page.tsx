import { redirect } from "next/navigation"
import { getUserWithRole, isAdminRole } from "@/lib/auth"
import { MemoriesClient } from "./memories-client"

// The role lives in the database, so this page must never be statically cached.
export const dynamic = "force-dynamic"

export default async function MemoriesPage() {
    const { user, role } = await getUserWithRole()

    if (!user) {
        redirect("/login")
    }

    if (!isAdminRole(role)) {
        redirect("/dashboard")
    }

    return <MemoriesClient />
}
