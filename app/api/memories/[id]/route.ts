import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
        .from("memory_logs")
        .select(`
            *,
            memory_photos (
                id,
                photo_url,
                created_at
            )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(data)
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const { error, data } = await supabase
        .from("memory_logs")
        .update({
            title: body.title,
            date: body.date,
            location: body.location || null,
            description: body.description || null,
            mood: body.mood || null,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First, get all photos to delete from storage
    const { data: photos } = await supabase
        .from("memory_photos")
        .select("photo_url")
        .eq("memory_log_id", id)

    // Delete photos from storage
    if (photos && photos.length > 0) {
        const filePaths = photos.map(p => {
            const url = new URL(p.photo_url)
            const pathParts = url.pathname.split('/storage/v1/object/public/memory-photos/')
            return pathParts[1] || ''
        }).filter(Boolean)

        if (filePaths.length > 0) {
            await supabase.storage.from('memory-photos').remove(filePaths)
        }
    }

    // Delete the memory log (photos will cascade delete)
    const { error } = await supabase
        .from("memory_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
