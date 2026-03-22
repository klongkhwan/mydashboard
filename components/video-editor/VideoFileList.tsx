'use client'

import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { VideoFile, formatFileSize, formatTime } from '@/types/video-editor'
import { Film, Play } from 'lucide-react'

interface VideoFileListProps {
    files: VideoFile[]
    selectedFile: VideoFile | null
    selectedForMerge: string[]
    onFileSelect: (file: VideoFile) => void
    onMergeSelect: (path: string, checked: boolean) => void
    className?: string
    isLoading?: boolean
}

export function VideoFileList({
    files,
    selectedFile,
    selectedForMerge,
    onFileSelect,
    onMergeSelect,
    className,
    isLoading = false,
}: VideoFileListProps) {
    if (isLoading) {
        return (
            <div className={cn('rounded-xl bg-card border border-border p-4', className)}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Film className="w-4 h-4 text-primary" />
                        Video Files
                    </h3>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="w-16 h-10 bg-muted rounded" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (files.length === 0) {
        return (
            <div className={cn('rounded-xl bg-card border border-border p-4', className)}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Film className="w-4 h-4 text-primary" />
                        Video Files
                    </h3>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Film className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">ไม่พบไฟล์วิดีโอ</p>
                    <p className="text-xs">กรุณาสแกนโฟลเดอร์เพื่อค้นหาไฟล์</p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn('rounded-xl bg-card border border-border overflow-hidden', className)}>
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" />
                    Video Files
                </h3>
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {files.length} ไฟล์
                </span>
            </div>

            <ScrollArea className="h-[400px] w-full">
                <div className="p-2 space-y-1 w-full">
                    {files.map((file) => {
                        const isSelected = selectedFile?.path === file.path
                        const isChecked = selectedForMerge.includes(file.path)

                        return (
                            <div
                                key={file.path}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden',
                                    'hover:bg-muted/50 group',
                                    isSelected && 'bg-primary/10 border border-primary/30'
                                )}
                                onClick={() => onFileSelect(file)}
                            >
                                {/* Checkbox for merge */}
                                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                    <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => onMergeSelect(file.path, !!checked)}
                                        className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                </div>

                                {/* Thumbnail */}
                                <div className={cn(
                                    'relative w-16 h-10 rounded bg-muted flex items-center justify-center overflow-hidden',
                                    'border border-border group-hover:border-primary/30 transition-colors'
                                )}>
                                    {file.thumbnail ? (
                                        <img
                                            src={file.thumbnail}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Film className="w-5 h-5 text-muted-foreground" />
                                    )}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <Play className="w-4 h-4 text-primary" />
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <p
                                        className={cn(
                                            'text-sm font-medium truncate',
                                            isSelected ? 'text-primary' : 'text-foreground'
                                        )}
                                        style={{ maxWidth: '280px' }}
                                        title={file.name}
                                    >
                                        {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{formatFileSize(file.size)}</span>
                                        <span>•</span>
                                        <span className="font-mono">{formatTime(file.duration)}</span>
                                        {file.width && file.height && (
                                            <>
                                                <span>•</span>
                                                <span>{file.width}×{file.height}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
