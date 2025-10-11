"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OTPInput } from "@/components/otp-input"
import { Shield, AlertCircle, Key } from "lucide-react"
import { login } from "@/app/actions/auth"
import { Loading } from "@/components/ui/loading"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isAutoLogging, setIsAutoLogging] = useState(false)
  const router = useRouter()

  const handleCodeComplete = async (enteredCode: string) => {
    setCode(enteredCode)
    setError("")
    setIsAutoLogging(true)

    // Auto-login when code is complete
    try {
      const result = await login(enteredCode)

      if (result.success) {
        router.push("/dashboard")
        router.refresh() // Refresh to update middleware
      } else {
        setError(result.error || "รหัสผ่านไม่ถูกต้อง")
        setCode("")
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ")
    } finally {
      setIsAutoLogging(false)
    }
  }

  const handleLogin = async () => {
    if (code.length !== 5) return

    setIsLoading(true)
    setError("")

    try {
      const result = await login(code)

      if (result.success) {
        router.push("/dashboard")
        router.refresh() // Refresh to update middleware
      } else {
        setError(result.error || "รหัสผ่านไม่ถูกต้อง")
        setCode("")
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-balance bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                เข้าสู่ระบบ
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2 text-base">
                กรุณากรอกรหัสผ่าน 5 หลักเพื่อเข้าสู่ระบบ
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-sm font-medium text-foreground">
                    <Key className="w-4 h-4 text-primary" />
                    <span>รหัสผ่าน</span>
                  </div>
                </div>
                <OTPInput
                  length={5}
                  onComplete={handleCodeComplete}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isAutoLogging && (
                <div className="flex items-center justify-center gap-2 text-primary text-sm bg-primary/10 p-3 rounded-lg border border-primary/20">
                  <Loading
                    size="sm"
                    variant="spinner"
                    className="text-primary"
                  />
                  <span>กำลังเข้าสู่ระบบอัตโนมัติ...</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleLogin}
              disabled={code.length !== 5 || isLoading || isAutoLogging}
              className="w-full h-12 font-medium text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {(isLoading || isAutoLogging) ? (
                <Loading
                  size="sm"
                  text="กำลังเข้าสู่ระบบ..."
                  variant="spinner"
                />
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>

            <div className="text-center space-y-2">
              {/* <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <span className="font-mono font-semibold">รหัสทดสอบ: 12345</span>
              </div> */}
              <div className="text-xs text-muted-foreground">
                {code.length > 0 && code.length < 5 && `กรอกครบ ${5 - code.length} หลัก`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
