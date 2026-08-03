'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, PenLine, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'edit-pdf-signatures'
const CANVAS_WIDTH = 560
const CANVAS_HEIGHT = 200

export function loadSavedSignatures(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
        return []
    }
}

function persistSignature(dataUrl: string) {
    const next = [dataUrl, ...loadSavedSignatures().filter((item) => item !== dataUrl)].slice(0, 5)
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
        // โควตา localStorage เต็มก็ยังใช้ลายเซ็นในรอบนี้ได้ตามปกติ
    }
    return next
}

interface SignaturePadProps {
    onUse: (dataUrl: string) => void
}

export function SignaturePad({ onUse }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawingRef = useRef(false)
    const dirtyRef = useRef(false)
    const [saved, setSaved] = useState<string[]>([])

    useEffect(() => setSaved(loadSavedSignatures()), [])

    const context = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return null
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#111111'
        return ctx
    }, [])

    const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        return {
            x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        }
    }

    const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const ctx = context()
        if (!ctx) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drawingRef.current = true
        dirtyRef.current = true
        const point = pointFromEvent(event)
        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
    }

    const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return
        const ctx = context()
        if (!ctx) return
        const point = pointFromEvent(event)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
    }

    const end = () => {
        drawingRef.current = false
    }

    const clear = () => {
        const canvas = canvasRef.current
        const ctx = context()
        if (!canvas || !ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        dirtyRef.current = false
    }

    const use = () => {
        const canvas = canvasRef.current
        if (!canvas || !dirtyRef.current) return
        const dataUrl = canvas.toDataURL('image/png')
        setSaved(persistSignature(dataUrl))
        onUse(dataUrl)
    }

    const onUploadSignature = async (file: File | undefined) => {
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = String(reader.result)
            setSaved(persistSignature(dataUrl))
            onUse(dataUrl)
        }
        reader.readAsDataURL(file)
    }

    return (
        <div className="space-y-3">
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className="w-full cursor-crosshair touch-none rounded-lg border border-dashed border-border bg-white"
            />
            <p className="text-xs text-muted-foreground">เซ็นด้วยเมาส์หรือนิ้วในกรอบด้านบน พื้นหลังจะโปร่งใสเมื่อวางลงเอกสาร</p>

            <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={use} className="gap-2">
                    <PenLine className="h-4 w-4" />
                    ใช้ลายเซ็นนี้
                </Button>
                <Button size="sm" variant="outline" onClick={clear} className="gap-2">
                    <Eraser className="h-4 w-4" />
                    ล้าง
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    อัปโหลดรูปลายเซ็น
                    <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(event) => void onUploadSignature(event.target.files?.[0])}
                    />
                </label>
            </div>

            {saved.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">ลายเซ็นที่บันทึกไว้</p>
                    <div className="flex flex-wrap gap-2">
                        {saved.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onUse(item)}
                                className={cn(
                                    'rounded-lg border border-border bg-white p-1 transition-colors hover:border-primary'
                                )}
                            >
                                <img src={item} alt="ลายเซ็นที่บันทึกไว้" className="h-10 w-auto" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
