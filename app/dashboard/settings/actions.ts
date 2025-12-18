"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Not authenticated" }
    }

    const fullName = formData.get("fullName") as string
    const imageFile = formData.get("imageFile") as File | null

    let avatarUrl = formData.get("avatarUrl") as string

    // Handle Image Upload
    if (imageFile && imageFile.size > 0) {

        // 1. Upload new image
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, imageFile as any) // Type casting for File in server action

        if (uploadError) {
            console.error("Upload error:", uploadError)
            return { error: "Failed to upload image" }
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

        const oldAvatarUrl = avatarUrl;
        avatarUrl = publicUrl

        // 3. Delete old image if it exists and is hosted on our supabase
        if (oldAvatarUrl && oldAvatarUrl.includes("supabase")) {
            const oldFileName = oldAvatarUrl.split('/').pop()
            if (oldFileName) {
                await supabase.storage
                    .from('avatars')
                    .remove([oldFileName])
            }
        }
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

    if (error) {
        return { error: error.message }
    }

    // revalidatePath("/dashboard/settings")
    // revalidatePath("/", "layout")
    // Client side update via event listener instead to avoid page refresh
    return { success: true, message: "Profile updated successfully" }
}

export async function getProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    return data
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Not authenticated" }
    }

    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!newPassword || newPassword.length < 6) {
        return { error: "Password must be at least 6 characters" }
    }

    if (newPassword !== confirmPassword) {
        return { error: "Passwords do not match" }
    }

    const { error } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true, message: "Password updated successfully" }
}
