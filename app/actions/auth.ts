"use server"

import { cookies } from "next/headers"

const AUTH_CODE = "12345"

export async function login(code: string) {
  if (code !== AUTH_CODE) {
    return { success: false, error: "รหัสไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" }
  }

  const cookieStore = await cookies()
  cookieStore.set("auth-token", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  })

  return { success: true }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
  return { success: true }
}
