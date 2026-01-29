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

export default function MemoriesPage() {
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>ต้องใช้รหัสผ่าน</CardTitle>
                        <CardDescription>
                            กรุณากรอกรหัสผ่านเพื่อเข้าถึง Memories
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="กรอกรหัสผ่าน"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    setError("")
                                }}
                                onKeyDown={handleKeyDown}
                                className="pr-10"
                                autoFocus
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive text-center">{error}</p>
                        )}
                        <Button onClick={handleUnlock} className="w-full">
                            ปลดล็อก
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">บันทึกความทรงจำ</h1>
            </div>
            <MemoryLogManager />
        </div>
    )
}
