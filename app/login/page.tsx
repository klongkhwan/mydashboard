"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Shield, AlertCircle, Mail, Lock, Sparkles } from "lucide-react"
import { login } from "./actions"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
      setError("เกิดข้อผิดพลาดที่ไม่คาดคิด")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Gradient Orbs - More Vivid */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-primary/30 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[90px]" />
      <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-accent/25 rounded-full blur-[85px]" />

      <div className="w-full max-w-md relative z-10">
        <Card className="overflow-hidden bg-card/60 backdrop-blur-xl border-border/50">
          {/* Gradient Top Border */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/10 rounded-2xl flex items-center justify-center shadow-lg border border-primary/20 backdrop-blur-sm animate-float">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold gradient-text">
                ยินดีต้อนรับ
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2 text-base">
                เข้าสู่ระบบเพื่อจัดการข้อมูลของคุณ
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80">อีเมล</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground/80">รหัสผ่าน</Label>
                  <Link href="#" className="text-xs text-primary hover:text-accent hover:underline transition-colors">
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-300 text-sm bg-red-500/20 backdrop-blur-sm p-3 rounded-lg border border-red-500/30 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground border-0 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loading className="mr-2 h-4 w-4" /> กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> เข้าสู่ระบบ
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center bg-white/5 py-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              ยังไม่มีบัญชี?{" "}
              <Link href="/register" className="text-primary font-semibold hover:text-accent hover:underline transition-colors">
                สมัครสมาชิก
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
