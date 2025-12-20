"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { UserPlus, AlertCircle, Mail, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { signup } from "@/app/login/actions"
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"

export default function RegisterPage() {
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError("")
        setSuccess("")

        const formData = new FormData(event.currentTarget)

        // Client-side simple validation
        const p1 = formData.get("password") as string
        const p2 = formData.get("confirmPassword") as string

        if (p1 !== p2) {
            setError("รหัสผ่านไม่ตรงกัน")
            setIsLoading(false)
            return
        }

        try {
            const result = await signup(formData)

            if (result?.error) {
                setError(result.error)
                toast.error("สมัครสมาชิกไม่สำเร็จ", { description: result.error })
            } else if (result?.success) {
                setSuccess(result.message || "สมัครสมาชิกสำเร็จ")
                toast.success("สมัครสมาชิกสำเร็จ", { description: "กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน" })
            }
            // If redirect, it's handled by server action
        } catch (err) {
            setError("เกิดข้อผิดพลาด")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-muted/20 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="border-border/50 shadow-2xl bg-card/95 backdrop-blur-sm overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />
                    <CardHeader className="text-center space-y-4 pb-2 pt-8">
                        <div>
                            <CardTitle className="text-3xl font-bold gradient-text">
                                สมัครสมาชิก
                            </CardTitle>
                            <CardDescription className="text-muted-foreground mt-2 text-base">
                                สร้างบัญชีผู้ใช้ใหม่เพื่อใช้งานระบบ
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        {success ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-lg">สมัครสมาชิกสำเร็จ!</h3>
                                    <p className="text-muted-foreground text-sm">{success}</p>
                                </div>
                                <Link href="/login">
                                    <Button variant="outline" className="mt-4">กลับไปหน้าเข้าสู่ระบบ</Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">อีเมล</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                                    <Label htmlFor="password">รหัสผ่าน</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pl-9 pr-10"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pl-9 pr-10"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loading className="mr-2 h-4 w-4" /> กำลังดำเนินการ...
                                        </>
                                    ) : (
                                        "ลงทะเบียน"
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-center bg-muted/30 py-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                            มีบัญชีอยู่แล้ว?{" "}
                            <Link href="/login" className="text-primary font-semibold hover:underline">
                                เข้าสู่ระบบ
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
