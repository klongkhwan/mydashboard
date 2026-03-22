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
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { VideoFile, formatFileSize, formatTime } from '@/types/video-editor'
import { GripVertical, X, ArrowUp, ArrowDown, Layers } from 'lucide-react'

interface MergeQueueProps {
    files: VideoFile[]
    onRemove: (path: string) => void
    onReorder: (fromIndex: number, toIndex: number) => void
    className?: string
}

// ─── Sortable Item ────────────────────────────────────────────────────────────
interface SortableItemProps {
    file: VideoFile
    index: number
    total: number
    onRemove: (path: string) => void
    onMoveUp: (index: number) => void
    onMoveDown: (index: number) => void
}

function SortableItem({ file, index, total, onRemove, onMoveUp, onMoveDown }: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: file.path,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors group',
                isDragging && 'opacity-50 shadow-lg border-primary/50 z-50 bg-card'
            )}
        >
            {/* Order Number */}
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
            </div>

            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-0.5 rounded hover:bg-muted"
                aria-label="Drag to reorder"
            >
                <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span className="font-mono">{formatTime(file.duration)}</span>
                </div>
            </div>

            {/* Actions (Up / Down / Remove) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move up"
                >
                    <ArrowUp className="w-3 h-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMoveDown(index)}
                    disabled={index === total - 1}
                    aria-label="Move down"
                >
                    <ArrowDown className="w-3 h-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemove(file.path)}
                    aria-label="Remove"
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>
        </div>
    )
}

// ─── MergeQueue ───────────────────────────────────────────────────────────────
export function MergeQueue({ files, onRemove, onReorder, className }: MergeQueueProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = files.findIndex((f) => f.path === active.id)
            const newIndex = files.findIndex((f) => f.path === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
                onReorder(oldIndex, newIndex)
            }
        }
    }

    const moveUp = (index: number) => { if (index > 0) onReorder(index, index - 1) }
    const moveDown = (index: number) => { if (index < files.length - 1) onReorder(index, index + 1) }

    const totalDuration = files.reduce((sum, f) => sum + f.duration, 0)
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)

    if (files.length === 0) {
        return (
            <div className={cn('rounded-xl bg-card border border-border p-4', className)}>
                <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Merge Queue</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Layers className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm text-center">
                        เลือกไฟล์จากรายการด้านบน<br />
                        เพื่อเพิ่มเข้าคิวรวมวิดีโอ
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn('rounded-xl bg-card border border-border', className)}>
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Merge Queue</h3>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {files.length} ไฟล์
                </span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={files.map((f) => f.path)} strategy={verticalListSortingStrategy}>
                    <ScrollArea className="max-h-[250px]">
                        <div className="p-2 space-y-1">
                            {files.map((file, index) => (
                                <SortableItem
                                    key={file.path}
                                    file={file}
                                    index={index}
                                    total={files.length}
                                    onRemove={onRemove}
                                    onMoveUp={moveUp}
                                    onMoveDown={moveDown}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </SortableContext>
            </DndContext>

            {/* Summary */}
            <div className="p-4 border-t border-border bg-muted/20">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Duration:</span>
                    <span className="font-mono text-primary font-semibold">{formatTime(totalDuration)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Total Size:</span>
                    <span className="font-mono text-foreground">{formatFileSize(totalSize)}</span>
                </div>
            </div>
        </div>
    )
}
