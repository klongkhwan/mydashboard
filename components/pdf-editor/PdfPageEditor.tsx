'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Loader2, PenLine, Trash2, Type } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { SignaturePad } from './SignaturePad'
import type { PageRender, PdfPageRef, Placement } from './pdf-editor.types'

const DEFAULT_FONT_SIZE = 16
const DEFAULT_COLOR = '#111111'
/** ความกว้างเริ่มต้นของรูป/ลายเซ็นเทียบกับความกว้างหน้า */
const DEFAULT_IMAGE_WIDTH = 0.28

interface PdfPageEditorProps {
    page: PdfPageRef
    render: PageRender | null
    pageNumber: number
    totalPages: number
    canGoPrev: boolean
    canGoNext: boolean
    onPrev: () => void
    onNext: () => void
    onClose: () => void
    onAdd: (placement: Placement) => void
    onUpdate: (placementId: string, patch: Partial<Placement>) => void
    onRemove: (placementId: string) => void
}

type DragState = {
    id: string
    mode: 'move' | 'resize'
    pointerX: number
    pointerY: number
    origin: { x: number; y: number; w: number; h: number }
}

export function PdfPageEditor({
    page,
    render,
    pageNumber,
    totalPages,
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    onClose,
    onAdd,
    onUpdate,
    onRemove,
}: PdfPageEditorProps) {
    const surfaceRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ id: string; x: number; y: number; w?: number; h?: number } | null>(null)
    const [signatureOpen, setSignatureOpen] = useState(false)

    const selected = page.placements.find((item) => item.id === selectedId) ?? null
    const isRotated = page.rotation !== 0 || (render?.baseRotation ?? 0) !== 0
    // ข้อความเก็บขนาดเป็น pt ของหน้าจริง จึงต้องคูณอัตราส่วนก่อนแสดงบนจอ
    const screenScale = render ? render.width / render.pointWidth : 1

    useEffect(() => setSelectedId(null), [page.id])

    const commitDrag = useCallback(() => {
        const drag = dragRef.current
        const current = preview
        dragRef.current = null
        setPreview(null)
        if (!drag || !current) return
        onUpdate(
            drag.id,
            drag.mode === 'move'
                ? { x: current.x, y: current.y }
                : ({ w: current.w, h: current.h } as Partial<Placement>)
        )
    }, [onUpdate, preview])

    useEffect(() => {
        if (!dragRef.current && !preview) return

        const onMove = (event: PointerEvent) => {
            const drag = dragRef.current
            const surface = surfaceRef.current
            if (!drag || !surface) return

            const rect = surface.getBoundingClientRect()
            const dx = (event.clientX - drag.pointerX) / rect.width
            const dy = (event.clientY - drag.pointerY) / rect.height

            if (drag.mode === 'move') {
                setPreview({
                    id: drag.id,
                    x: clamp(drag.origin.x + dx, 0, 1),
                    y: clamp(drag.origin.y + dy, 0, 1),
                })
            } else {
                setPreview({
                    id: drag.id,
                    x: drag.origin.x,
                    y: drag.origin.y,
                    w: clamp(drag.origin.w + dx, 0.03, 1),
                    h: clamp(drag.origin.h + dy, 0.02, 1),
                })
            }
        }

        const onUp = () => commitDrag()

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }
    }, [commitDrag, preview])

    const startDrag = (event: React.PointerEvent, item: Placement, mode: 'move' | 'resize') => {
        event.preventDefault()
        event.stopPropagation()
        setSelectedId(item.id)
        dragRef.current = {
            id: item.id,
            mode,
            pointerX: event.clientX,
            pointerY: event.clientY,
            origin: {
                x: item.x,
                y: item.y,
                w: item.kind === 'image' ? item.w : 0,
                h: item.kind === 'image' ? item.h : 0,
            },
        }
        setPreview({ id: item.id, x: item.x, y: item.y, w: item.kind === 'image' ? item.w : undefined, h: item.kind === 'image' ? item.h : undefined })
    }

    const addText = () => {
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'text',
            x: 0.1,
            y: 0.1,
            text: 'ข้อความ',
            fontSize: DEFAULT_FONT_SIZE,
            color: DEFAULT_COLOR,
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const addImage = (dataUrl: string, naturalRatio: number) => {
        if (!render) return
        const width = DEFAULT_IMAGE_WIDTH
        const pageRatio = render.pointWidth / render.pointHeight
        const placement: Placement = {
            id: crypto.randomUUID(),
            kind: 'image',
            x: 0.1,
            y: 0.1,
            w: width,
            // คงสัดส่วนรูปเดิมโดยเทียบกับอัตราส่วนของหน้า
            h: (width / naturalRatio) * pageRatio,
            dataUrl,
        }
        onAdd(placement)
        setSelectedId(placement.id)
    }

    const onPickImage = (file: File | undefined) => {
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = String(reader.result)
            const image = new Image()
            image.onload = () => addImage(dataUrl, image.naturalWidth / image.naturalHeight)
            image.src = dataUrl
        }
        reader.readAsDataURL(file)
    }

    const rectFor = (item: Placement) => {
        const live = preview?.id === item.id ? preview : null
        const x = live?.x ?? item.x
        const y = live?.y ?? item.y
        if (item.kind === 'image') {
            return { x, y, w: live?.w ?? item.w, h: live?.h ?? item.h }
        }
        return { x, y, w: undefined, h: undefined }
    }

    return (
        <div className="flex h-full flex-col">
            <style>{`@font-face{font-family:'SarabunPdfPreview';src:url('/fonts/Sarabun-Regular.ttf') format('truetype');font-display:swap}`}</style>

            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card/50 px-6 py-3">
                <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปหน้ารวม
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev} disabled={!canGoPrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 text-sm text-muted-foreground">
                        หน้า {pageNumber} / {totalPages}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext} disabled={!canGoNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                {isRotated && (
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        หน้านี้ถูกหมุนอยู่ — แสดงแบบไม่หมุนเพื่อวางของ ของที่วางจะหมุนไปพร้อมหน้าตอนบันทึก
                    </span>
                )}
            </div>

            <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex min-w-0 items-start justify-center overflow-auto">
                    {render ? (
                        <div
                            ref={surfaceRef}
                            onPointerDown={() => setSelectedId(null)}
                            className="relative select-none shadow-lg"
                            style={{ width: '100%', maxWidth: render.width }}
                        >
                            <img src={render.url} alt={`หน้า ${pageNumber}`} className="block w-full" draggable={false} />

                            {page.placements.map((item) => {
                                const box = rectFor(item)
                                const isSelected = item.id === selectedId
                                return (
                                    <div
                                        key={item.id}
                                        onPointerDown={(event) => startDrag(event, item, 'move')}
                                        className={cn(
                                            'absolute cursor-move',
                                            isSelected ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/50'
                                        )}
                                        style={{
                                            left: `${box.x * 100}%`,
                                            top: `${box.y * 100}%`,
                                            width: item.kind === 'image' ? `${(box.w ?? 0) * 100}%` : undefined,
                                            height: item.kind === 'image' ? `${(box.h ?? 0) * 100}%` : undefined,
                                        }}
                                    >
                                        {item.kind === 'image' ? (
                                            <img src={item.dataUrl} alt="" className="h-full w-full" draggable={false} />
                                        ) : (
                                            <span
                                                className="block whitespace-pre leading-none"
                                                style={{
                                                    fontFamily: "'SarabunPdfPreview', sans-serif",
                                                    fontSize: item.fontSize * screenScale,
                                                    color: item.color,
                                                }}
                                            >
                                                {item.text}
                                            </span>
                                        )}

                                        {isSelected && item.kind === 'image' && (
                                            <span
                                                onPointerDown={(event) => startDrag(event, item, 'resize')}
                                                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm border border-background bg-primary"
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex h-64 items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            กำลังเตรียมหน้า…
                        </div>
                    )}
                </div>

                <aside className="space-y-4 overflow-y-auto xl:border-l xl:border-border xl:pl-6">
                    <section className="space-y-2">
                        <h2 className="text-sm font-semibold text-foreground">วางของลงหน้า</h2>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={addText}
                            disabled={!render}
                        >
                            <Type className="h-4 w-4" />
                            เพิ่มข้อความ
                        </Button>
                        {/* ต้องรอภาพหน้าก่อน เพราะรูปใช้สัดส่วนของหน้าคำนวณความสูงให้ไม่ผิดส่วน */}
                        <label
                            className={cn(
                                'flex w-full items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors',
                                render ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-50'
                            )}
                        >
                            <ImagePlus className="h-4 w-4" />
                            เพิ่มรูป
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                disabled={!render}
                                className="hidden"
                                onChange={(event) => {
                                    onPickImage(event.target.files?.[0])
                                    event.target.value = ''
                                }}
                            />
                        </label>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => setSignatureOpen(true)}
                            disabled={!render}
                        >
                            <PenLine className="h-4 w-4" />
                            เซ็นชื่อ
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            {render ? 'ลากเพื่อย้าย · ลากมุมขวาล่างของรูปเพื่อย่อ-ขยาย' : 'รอภาพหน้าโหลดเสร็จก่อนวางของ'}
                        </p>
                    </section>

                    {selected && (
                        <section className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {selected.kind === 'text' ? 'ข้อความที่เลือก' : 'รูปที่เลือก'}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => {
                                        onRemove(selected.id)
                                        setSelectedId(null)
                                    }}
                                    aria-label="ลบของที่เลือก"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {selected.kind === 'text' && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="placement-text" className="text-xs text-muted-foreground">
                                            ข้อความ
                                        </Label>
                                        <Input
                                            id="placement-text"
                                            value={selected.text}
                                            onChange={(event) => onUpdate(selected.id, { text: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>ขนาดตัวอักษร</span>
                                            <span>{selected.fontSize} pt</span>
                                        </div>
                                        <Slider
                                            value={[selected.fontSize]}
                                            min={6}
                                            max={72}
                                            step={1}
                                            onValueChange={(value) => onUpdate(selected.id, { fontSize: value[0] })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="placement-color" className="text-xs text-muted-foreground">
                                            สี
                                        </Label>
                                        <Input
                                            id="placement-color"
                                            type="color"
                                            value={selected.color}
                                            onChange={(event) => onUpdate(selected.id, { color: event.target.value })}
                                            className="h-9 p-1"
                                        />
                                    </div>
                                </>
                            )}

                            {selected.kind === 'image' && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>ความกว้าง</span>
                                        <span>{Math.round(selected.w * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[Math.round(selected.w * 100)]}
                                        min={3}
                                        max={100}
                                        step={1}
                                        onValueChange={(value) => {
                                            const nextWidth = value[0] / 100
                                            const ratio = selected.h / selected.w
                                            onUpdate(selected.id, { w: nextWidth, h: nextWidth * ratio })
                                        }}
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    {page.placements.length > 0 && (
                        <section className="space-y-2 border-t border-border pt-4">
                            <h2 className="text-sm font-semibold text-foreground">ของบนหน้านี้ ({page.placements.length})</h2>
                            {page.placements.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors',
                                        item.id === selectedId ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
                                    )}
                                >
                                    {item.kind === 'text' ? <Type className="h-4 w-4 shrink-0" /> : <ImagePlus className="h-4 w-4 shrink-0" />}
                                    <span className="truncate">{item.kind === 'text' ? item.text : 'รูป / ลายเซ็น'}</span>
                                </button>
                            ))}
                        </section>
                    )}
                </aside>
            </div>

            <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>เซ็นชื่อ</DialogTitle>
                    </DialogHeader>
                    <SignaturePad
                        onUse={(dataUrl) => {
                            const image = new Image()
                            image.onload = () => addImage(dataUrl, image.naturalWidth / image.naturalHeight)
                            image.src = dataUrl
                            setSignatureOpen(false)
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}
