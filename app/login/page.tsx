"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Shield, AlertCircle, Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react"
import { login } from "./actions"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // /auth/confirm sends the user back here with ?error=... when an email link
  // is expired or already used.
  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("error")
    if (!message) return

    setError(message)
    toast.error("ยืนยันอีเมลไม่สำเร็จ", { description: message })
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)

    try {
      const result = await login(formData)

      if (result?.error) {
        setError(result.error)
        toast.error("เข้าสู่ระบบไม่สำเร็จ", { description: result.error })
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาด")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="card-spotify border border-white/10 shadow-heavy bg-[#181818] overflow-hidden text-center">
          <CardHeader className="text-center space-y-3 pb-2 pt-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-play">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-white tracking-tight">
                ยินดีต้อนรับ
              </CardTitle>
              <CardDescription className="text-spotify-muted mt-2 text-sm">
                เข้าสู่ระบบเพื่อจัดการข้อมูลของคุณ
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <form onSubmit={handleSubmit} method="POST" className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="email" className="text-spotify-label">อีเมล</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-spotify-muted" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className="spotify-input pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-spotify-label">รหัสผ่าน</Label>
                  <Link href="#" className="text-xs text-primary hover:underline transition-colors">
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-spotify-muted" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="spotify-input pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-spotify-muted hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="btn-pill-primary w-full h-11 text-xs"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loading size="sm" />
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center bg-white/[0.02] py-4 border-t border-white/5">
            <p className="text-sm text-spotify-muted">
              ยังไม่มีบัญชี?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline transition-colors ml-1">
                สมัครสมาชิก
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

