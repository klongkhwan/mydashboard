"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { z } from "zod"

const loginSchema = z.object({
    email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }),
    password: z.string().min(6, { message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
})

const registerSchema = z.object({
    email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }),
    password: z.string().min(6, { message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
})

export async function login(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
        return { error: validation.error.errors[0].message }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
}

export async function signup(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    const validation = registerSchema.safeParse({ email, password, confirmPassword })
    if (!validation.success) {
        return { error: validation.error.errors[0].message }
    }

    const supabase = await createClient()

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // Optional: Add metadata like full name here if you add it to the form
            // data: { full_name: 'John Doe' } 
        }
    })

    if (error) {
        return { error: error.message }
    }

    // NOTE: If email confirmation is enabled in Supabase, the user won't be logged in immediately.
    // Check if session exists or handle "Check your email" message.
    if (data?.user && !data.session) {
        return { success: true, message: "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน" }
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath("/", "layout")
    redirect("/login")
}
