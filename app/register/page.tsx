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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="card-spotify border border-white/10 shadow-heavy bg-[#181818] overflow-hidden">
                    <CardHeader className="text-center space-y-3 pb-2 pt-8">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-play">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-bold text-white tracking-tight">
                                สมัครสมาชิก
                            </CardTitle>
                            <CardDescription className="text-spotify-muted mt-2 text-sm">
                                สร้างบัญชีผู้ใช้ใหม่เพื่อเข้าสู่ระบบ
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        {success ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center shadow-play">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg text-white">สมัครสมาชิกสำเร็จ!</h3>
                                    <p className="text-spotify-muted text-sm">{success}</p>
                                </div>
                                <Link href="/login">
                                    <Button className="btn-pill-primary mt-4">กลับไปหน้าเข้าสู่ระบบ</Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
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
                                    <Label htmlFor="password" className="text-spotify-label">รหัสผ่าน</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-spotify-muted" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="spotify-input pl-10 pr-10"
                                            required
                                            minLength={6}
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
                                <div className="space-y-2 text-left">
                                    <Label htmlFor="confirmPassword" className="text-spotify-label">ยืนยันรหัสผ่าน</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-spotify-muted" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="spotify-input pl-10 pr-10"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-3.5 text-spotify-muted hover:text-white transition-colors"
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
                                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-left">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button type="submit" className="btn-pill-primary w-full h-11 text-xs" disabled={isLoading}>
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
                    <CardFooter className="flex justify-center bg-white/[0.02] py-4 border-t border-white/5">
                        <p className="text-sm text-spotify-muted">
                            มีบัญชีอยู่แล้ว?{" "}
                            <Link href="/login" className="text-primary font-bold hover:underline ml-1">
                                เข้าสู่ระบบ
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}

