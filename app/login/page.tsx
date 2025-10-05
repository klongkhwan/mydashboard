"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OTPInput } from "@/components/otp-input"
import { Shield, AlertCircle } from "lucide-react"
import { login } from "@/app/actions/auth"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCodeComplete = (enteredCode: string) => {
    setCode(enteredCode)
    setError("")
  }

  const handleLogin = async () => {
    setIsLoading(true)
    setError("")

    try {
      const result = await login(code)

      if (result.success) {
        router.push("/dashboard")
        router.refresh() // Refresh to update middleware
      } else {
        setError(result.error || "เกิดข้อผิดพลาด")
        setCode("")
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-balance">เข้าสู่ระบบ</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">กรุณากรอกรหัส 5 หลักเพื่อเข้าสู่ระบบ</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <OTPInput length={5} onComplete={handleCodeComplete} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <Button onClick={handleLogin} disabled={code.length !== 5 || isLoading} className="w-full h-11 font-medium">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">รหัสทดสอบ: 12345</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
