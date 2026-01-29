import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; photoId: string }> }
) {
    const { id: memoryLogId, photoId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the memory log belongs to the user
    const { data: memoryLog } = await supabase
        .from("memory_logs")
        .select("id")
        .eq("id", memoryLogId)
        .eq("user_id", user.id)
        .single()

    if (!memoryLog) {
        return NextResponse.json({ error: "Memory log not found" }, { status: 404 })
    }

    // Get the photo record
    const { data: photo } = await supabase
        .from("memory_photos")
        .select("photo_url")
        .eq("id", photoId)
        .eq("memory_log_id", memoryLogId)
        .single()

    if (!photo) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Extract file path from URL and delete from storage
    try {
        const url = new URL(photo.photo_url)
        const pathParts = url.pathname.split('/storage/v1/object/public/memory-photos/')
        const filePath = pathParts[1]

        if (filePath) {
            await supabase.storage.from('memory-photos').remove([filePath])
        }
    } catch {
        // Continue with database deletion even if storage deletion fails
        console.error("Failed to delete from storage")
    }

    // Delete from database
    const { error } = await supabase
        .from("memory_photos")
        .delete()
        .eq("id", photoId)
        .eq("memory_log_id", memoryLogId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
