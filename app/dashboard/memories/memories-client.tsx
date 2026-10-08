"use client"

import { useState, useEffect } from "react"
import { MemoryLogManager } from "./components/memory-log-manager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, Eye, EyeOff } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ModernPageLoading } from "@/components/ui/modern-loader"

const PASSWORD = "pwsn"
const SESSION_KEY = "memories_unlocked"

import { PageHeader } from "@/components/ui/page-header"

export function MemoriesClient() {
    const [isLoading, setIsLoading] = useState(true)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        // Check session storage for unlock status
        const unlocked = sessionStorage.getItem(SESSION_KEY)
        if (unlocked === "true") {
            setIsUnlocked(true)
        }
        setIsLoading(false)
    }, [])

    const handleUnlock = () => {
        if (password === PASSWORD) {
            setIsUnlocked(true)
            sessionStorage.setItem(SESSION_KEY, "true")
            setError("")
        } else {
            setError("รหัสผ่านไม่ถูกต้อง")
            setPassword("")
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleUnlock()
        }
    }

    // Show loading while checking session
    if (isLoading) {
        return <ModernPageLoading />
    }

    if (!isUnlocked) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Card className="w-full max-w-sm card-spotify border border-white/5 shadow-heavy bg-[#181818]">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-6 p-4 rounded-full bg-primary/10 w-fit shadow-play">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-white font-black tracking-tighter text-2xl">ต้องการรหัสผ่าน</CardTitle>
                        <CardDescription className="text-spotify-muted mt-2">
                            กรุณากรอกรหัสผ่านเพื่อเข้าถึง Memories
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    setError("")
                                }}
                                onKeyDown={handleKeyDown}
                                className="spotify-input pr-12 h-12"
                                autoFocus
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {error && (
                            <p className="text-xs font-bold text-[#f3727f] text-center uppercase tracking-wider">{error}</p>
                        )}
                        <Button onClick={handleUnlock} className="btn-pill-primary w-full h-12">
                            ปลดล็อก
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
            <PageHeader
                eyebrow="Personal"
                title="Memories"
                description="บันทึกความทรงจำ เรื่องราว และรูปภาพสำคัญของคุณ"
            />
            <MemoryLogManager />
        </div>
    )
}

