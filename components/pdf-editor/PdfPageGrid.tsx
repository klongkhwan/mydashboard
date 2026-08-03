'use client'

import React from 'react'
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
}: SortablePageProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
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
                onClick={(event) => onSelect(page.id, event.shiftKey || event.metaKey || event.ctrlKey)}
                aria-pressed={isSelected}
                aria-label={`หน้า ${index + 1}`}
                className={cn(
                    'flex aspect-square w-full cursor-grab items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-2 transition-colors active:cursor-grabbing',
                    isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/40' : 'border-border hover:border-primary/40'
                )}
            >
                {thumb ? (
                    <img
                        src={thumb.url}
                        alt=""
                        draggable={false}
                        style={{ transform: `rotate(${page.rotation}deg)` }}
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

            <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
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
                'rounded-md bg-background/90 p-1 text-muted-foreground shadow-sm transition-colors hover:bg-background',
                destructive ? 'hover:text-destructive' : 'hover:text-foreground'
            )}
        >
            {children}
        </button>
    )
}

export function PdfPageGrid({ pages, thumbs, onReorder, ...rest }: PdfPageGridProps) {
    const sensors = useSensors(
        // ต้องมีระยะลากขั้นต่ำ ไม่งั้นการคลิกเลือกหน้าจะกลายเป็นการเริ่มลาก
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = pages.findIndex((page) => page.id === active.id)
        const newIndex = pages.findIndex((page) => page.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return

        onReorder(arrayMove(pages, oldIndex, newIndex).map((page) => page.id))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map((page) => page.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {pages.map((page, index) => (
                        <SortablePage key={page.id} page={page} index={index} thumb={thumbs[thumbKey(page)]} {...rest} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}
