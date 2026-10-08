'use client'

import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { destroyPdfDoc, downloadBlob, formatBytes, getPdfjs, renderThumbnail } from './pdf-utils'

export type PdfOutput = { blob: Blob; name: string; description?: string }

export function PdfOutputPreview({ output, onClose }: { output: PdfOutput | null; onClose: () => void }) {
    const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
    const [index, setIndex] = useState(0)
    const [image, setImage] = useState<string | null>(null)
    const [error, setError] = useState('')
    const isImage = output?.blob.type.startsWith('image/') ?? false

    useEffect(() => {
        if (!output) return
        let active = true
        let loaded: PDFDocumentProxy | null = null
        setDoc(null)
        setImage(null)
        setIndex(0)
        setError('')
        if (output.blob.type.startsWith('image/')) {
            const url = URL.createObjectURL(output.blob)
            setImage(url)
            return () => URL.revokeObjectURL(url)
        }
        void (async () => {
            try {
                const pdfjs = await getPdfjs()
                loaded = await pdfjs.getDocument({ data: await output.blob.arrayBuffer() }).promise
                if (active) setDoc(loaded)
                else destroyPdfDoc(loaded)
            } catch (reason) {
                if (active) setError(reason instanceof Error ? reason.message : 'แสดงตัวอย่างไม่สำเร็จ')
            }
        })()
        return () => { active = false; if (loaded) destroyPdfDoc(loaded) }
    }, [output])

    useEffect(() => {
        if (!doc) return
        let active = true
        setImage(null)
        void renderThumbnail(doc, index, 1000).then((page) => {
            if (active) setImage(page.url)
        }).catch((reason) => { if (active) setError(String(reason)) })
        return () => { active = false }
    }, [doc, index])

    return (
        <Dialog open={!!output} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="flex max-h-[92dvh] w-[96vw] max-w-5xl flex-col gap-3">
                <DialogHeader className="pr-8"><DialogTitle>ตรวจไฟล์ก่อนดาวน์โหลด</DialogTitle><DialogDescription>ตัวอย่างจาก{isImage ? 'รูป' : ' PDF '}ผลลัพธ์จริง รวมข้อความ การหมุน และการตัดขอบแล้ว</DialogDescription></DialogHeader>
                {output && <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{output.name}</p><p className="text-xs text-muted-foreground">{formatBytes(output.blob.size)} {output.description && `· ${output.description}`}</p></div>
                    <Button size="sm" onClick={() => downloadBlob(output.blob, output.name)} className="gap-2"><Download className="h-4 w-4" />ดาวน์โหลดไฟล์นี้</Button>
                </div>}
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-muted/30 p-3 text-center">
                    {error ? <p role="alert" className="p-8 text-destructive">{error}</p> : image ? <img src={image} alt={isImage ? 'ตัวอย่างรูปผลลัพธ์' : `ตัวอย่างไฟล์ หน้า ${index + 1}`} className="mx-auto max-h-[65dvh] object-contain shadow-md" /> : <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />กำลังแสดงไฟล์ผลลัพธ์…</div>}
                </div>
                {!isImage && <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="icon" aria-label="ตัวอย่างหน้าก่อนหน้า" disabled={!doc || index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm tabular-nums">หน้า {index + 1} / {doc?.numPages ?? '…'}</span>
                    <Button variant="outline" size="icon" aria-label="ตัวอย่างหน้าถัดไป" disabled={!doc || index >= doc.numPages - 1} onClick={() => setIndex(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>}
            </DialogContent>
        </Dialog>
    )
}
