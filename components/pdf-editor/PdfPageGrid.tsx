'use client'

import React, { useEffect, useState } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, FileText, PenLine, RotateCcw, RotateCw, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { PageThumb, PdfPageRef } from './pdf-editor.types'
import { thumbKey } from './pdf-utils'

interface PdfPageGridProps {
    pages: PdfPageRef[]
    /** key คือ thumbKey(page) ไม่ใช่ page.id */
    thumbs: Record<string, PageThumb | undefined>
    selectedIds: Set<string>
    /** ชื่อไฟล์ต้นทางต่อ sourceId — แสดงบนหน้าเมื่อเปิดหลายไฟล์ */
    sourceNames: Record<string, string>
    showSourceBadge: boolean
    onSelect: (pageId: string, additive: boolean) => void
    onReorder: (order: string[]) => void
    onRotate: (pageId: string, degrees: 90 | 270) => void
    onDuplicate: (pageId: string) => void
    onDelete: (pageId: string) => void
    onOpenEditor: (pageId: string) => void
    /** ล็อกโครงสร้างหน้าเมื่อเครื่องมือปลายทางต้องรักษา widget/field tree เดิม */
    readOnly?: boolean
    onVisiblePagesChange?: (pageIds: string[]) => void
}

interface SortablePageProps extends Omit<PdfPageGridProps, 'pages' | 'thumbs' | 'onReorder'> {
    page: PdfPageRef
    index: number
    thumb?: PageThumb
}

function SortablePage({
    page,
    index,
    thumb,
    selectedIds,
    sourceNames,
    showSourceBadge,
    onSelect,
    onRotate,
    onDuplicate,
    onDelete,
    onOpenEditor,
    readOnly,
}: SortablePageProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id, disabled: readOnly })
    const isSelected = selectedIds.has(page.id)

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn('group relative', isDragging && 'z-50 opacity-60')}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(event) => onSelect(page.id, event.shiftKey)}
                aria-pressed={isSelected}
                aria-label={`หน้า ${index + 1}`}
                className={cn(
                    'flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-2 transition-colors',
                    !readOnly && 'cursor-grab active:cursor-grabbing',
                    isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/40' : 'border-border hover:border-primary/40'
                )}
            >
                {thumb ? (
                    <img
                        src={thumb.url}
                        alt=""
                        draggable={false}
                        className="max-h-full max-w-full object-contain shadow-sm transition-transform"
                    />
                ) : (
                    <FileText className="h-8 w-8 animate-pulse text-muted-foreground/40" />
                )}
            </button>

            <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-semibold text-foreground shadow-sm">
                {index + 1}
            </div>

            {showSourceBadge && (
                <div className="pointer-events-none absolute bottom-2 left-2 right-2 truncate rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                    {sourceNames[page.sourceId] ?? 'ไม่ทราบไฟล์'}
                </div>
            )}

            {page.placements.length > 0 && (
                <div className="pointer-events-none absolute left-10 top-2 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
                    <PenLine className="h-3 w-3" />
                    {page.placements.length}
                </div>
            )}

            {page.crop && (
                <div className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                    ตัดขอบ
                </div>
            )}

            {!readOnly && (
                <div className="mt-2 flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-50 sm:group-hover:opacity-100 focus-within:opacity-100">
                    <TileAction label="วางข้อความ/ลายเซ็น" onClick={() => onOpenEditor(page.id)}>
                        <PenLine className="h-3.5 w-3.5" />
                    </TileAction>
                    <TileAction label="หมุนซ้าย" onClick={() => onRotate(page.id, 270)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                    </TileAction>
                    <TileAction label="หมุนขวา" onClick={() => onRotate(page.id, 90)}>
                        <RotateCw className="h-3.5 w-3.5" />
                    </TileAction>
                    <TileAction label="ทำสำเนา" onClick={() => onDuplicate(page.id)}>
                        <Copy className="h-3.5 w-3.5" />
                    </TileAction>
                    <TileAction label="ลบหน้า" destructive onClick={() => onDelete(page.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </TileAction>
                </div>
            )}
        </div>
    )
}

function TileAction({
    label,
    destructive,
    onClick,
    children,
}: {
    label: string
    destructive?: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={onClick}
            className={cn(
                'rounded-md border bg-background/90 p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-muted',
                destructive ? 'hover:text-destructive' : 'hover:text-foreground'
            )}
        >
            {children}
        </button>
    )
}

export function PdfPageGrid({ pages, thumbs, onReorder, readOnly, onVisiblePagesChange, ...rest }: PdfPageGridProps) {
    const [batch, setBatch] = useState(0)
    const batchCount = Math.max(1, Math.ceil(pages.length / 24))
    const currentBatch = Math.min(batch, batchCount - 1)
    const visiblePages = pages.slice(currentBatch * 24, (currentBatch + 1) * 24)
    const visibleKey = visiblePages.map((page) => page.id).join(',')
    useEffect(() => {
        onVisiblePagesChange?.(visibleKey ? visibleKey.split(',') : [])
    }, [visibleKey, onVisiblePagesChange])
    const sensors = useSensors(
        // ต้องมีระยะลากขั้นต่ำ ไม่งั้นการคลิกเลือกหน้าจะกลายเป็นการเริ่มลาก
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (readOnly || !over || active.id === over.id) return

        const oldIndex = pages.findIndex((page) => page.id === active.id)
        const newIndex = pages.findIndex((page) => page.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return

        onReorder(arrayMove(pages, oldIndex, newIndex).map((page) => page.id))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visiblePages.map((page) => page.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {visiblePages.map((page, index) => (
                        <SortablePage key={page.id} page={page} index={currentBatch * 24 + index} thumb={thumbs[thumbKey(page)]} readOnly={readOnly} {...rest} />
                    ))}
                </div>
            </SortableContext>
            {batchCount > 1 && <div className="mt-5 flex items-center justify-center gap-3 text-sm">
                <button type="button" disabled={currentBatch === 0} onClick={() => setBatch(currentBatch - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ชุดก่อนหน้า</button>
                <span>{currentBatch * 24 + 1}–{Math.min(pages.length, (currentBatch + 1) * 24)} / {pages.length} หน้า</span>
                <button type="button" disabled={currentBatch >= batchCount - 1} onClick={() => setBatch(currentBatch + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ชุดถัดไป</button>
            </div>}
        </DndContext>
    )
}
