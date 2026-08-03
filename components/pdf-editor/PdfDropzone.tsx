'use client'

import React, { useRef, useState } from 'react'
import { FilePlus2, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PdfDropzoneProps {
    onFiles: (files: File[]) => void
    busy?: boolean
    compact?: boolean
    label?: string
    hint?: string
    /** รับรูปด้วยเมื่อใช้เครื่องมือแปลงรูปเป็น PDF */
    withImages?: boolean
}

export function PdfDropzone({ onFiles, busy, compact, label, hint, withImages }: PdfDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const pattern = withImages ? /\.(pdf|png|jpe?g)$/i : /\.pdf$/i

    const handleFiles = (list: FileList | null) => {
        const files = Array.from(list ?? []).filter((file) => pattern.test(file.name))
        if (files.length) onFiles(files)
    }

    return (
        <div
            onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                handleFiles(event.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors',
                compact ? 'gap-1 px-4 py-4' : 'gap-2 px-6 py-12',
                dragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={withImages ? 'application/pdf,image/png,image/jpeg' : 'application/pdf'}
                multiple
                className="hidden"
                onChange={(event) => {
                    handleFiles(event.target.files)
                    // เคลียร์ค่าเพื่อให้เลือกไฟล์ชื่อเดิมซ้ำได้
                    event.target.value = ''
                }}
            />
            {busy ? (
                <Loader2 className={cn('animate-spin text-primary', compact ? 'h-5 w-5' : 'h-9 w-9')} />
            ) : (
                <FilePlus2 className={cn('text-primary', compact ? 'h-5 w-5' : 'h-9 w-9')} />
            )}
            <span className={cn('font-medium text-foreground', compact && 'text-sm')}>
                {label ?? (withImages ? 'ลากไฟล์ PDF หรือรูปมาวาง' : 'ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก')}
            </span>
            {!compact && <span className="text-xs text-muted-foreground">{hint ?? 'เลือกได้หลายไฟล์พร้อมกัน'}</span>}
        </div>
    )
}
