import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: memoryLogId } = await params
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

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/webm",
        "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"
    ]
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
        return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const fileName = `${user.id}/${memoryLogId}/${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from("memory-photos")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
        })

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from("memory-photos")
        .getPublicUrl(fileName)

    // Save to database
    const { data, error } = await supabase
        .from("memory_photos")
        .insert({
            memory_log_id: memoryLogId,
            photo_url: publicUrl,
        })
        .select()
        .single()

    if (error) {
        // Cleanup uploaded file if database insert fails
        await supabase.storage.from("memory-photos").remove([fileName])
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
}
