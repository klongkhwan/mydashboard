'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/types/video-editor'

interface TimelineProps {
    duration: number
    currentTime: number
    startTime: number
    endTime: number
    onStartTimeChange: (time: number) => void
    onEndTimeChange: (time: number) => void
    onSeek: (time: number) => void
    className?: string
}

export function Timeline({
    duration,
    currentTime,
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    onSeek,
    className,
}: TimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null)

    const getPositionFromTime = (time: number): number => {
        if (duration === 0) return 0
        return (time / duration) * 100
    }

    const getTimeFromPosition = useCallback(
        (clientX: number): number => {
            if (!trackRef.current) return 0
            const rect = trackRef.current.getBoundingClientRect()
            const x = clientX - rect.left
            const percentage = Math.max(0, Math.min(1, x / rect.width))
            return percentage * duration
        },
        [duration]
    )

    const handleMouseDown = (type: 'start' | 'end' | 'playhead') => (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(type)
    }

    const handleTrackClick = (e: React.MouseEvent) => {
        if (isDragging) return
        const time = getTimeFromPosition(e.clientX)
        onSeek(time)
    }

    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            const time = getTimeFromPosition(e.clientX)

            if (isDragging === 'start') {
                onStartTimeChange(Math.min(time, endTime - 1))
            } else if (isDragging === 'end') {
                onEndTimeChange(Math.max(time, startTime + 1))
            } else if (isDragging === 'playhead') {
                onSeek(time)
            }
        }

        const handleMouseUp = () => {
            setIsDragging(null)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, endTime, startTime, getTimeFromPosition, onStartTimeChange, onEndTimeChange, onSeek])

    // Generate time markers
    const markers = []
    const interval = duration > 60 ? 10 : 5
    for (let i = 0; i <= duration; i += interval) {
        markers.push(i)
    }

    return (
        <div className={cn('select-none', className)}>
            {/* Time Markers */}
            <div className="relative h-6 mb-1">
                {markers.map((time) => (
                    <div
                        key={time}
                        className="absolute top-0 transform -translate-x-1/2"
                        style={{ left: `${getPositionFromTime(time)}%` }}
                    >
                        <div className="w-px h-2 bg-border" />
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {formatTime(time)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Timeline Track */}
            <div
                ref={trackRef}
                className="relative h-12 bg-card border border-border rounded-lg cursor-pointer overflow-hidden"
                onClick={handleTrackClick}
            >
                {/* Background Track */}
                <div className="absolute inset-0 bg-muted/30" />

                {/* Selected Range */}
                <div
                    className="absolute top-0 bottom-0 bg-primary/20 border-y-2 border-primary"
                    style={{
                        left: `${getPositionFromTime(startTime)}%`,
                        width: `${getPositionFromTime(endTime - startTime)}%`,
                    }}
                />

                {/* Start Handle */}
                <div
                    className={cn(
                        'absolute top-0 bottom-0 w-4 cursor-ew-resize group z-10',
                        isDragging === 'start' && 'cursor-grabbing'
                    )}
                    style={{ left: `calc(${getPositionFromTime(startTime)}% - 8px)` }}
                    onMouseDown={handleMouseDown('start')}
                >
                    <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-primary rounded-full group-hover:w-1.5 transition-all shadow-lg shadow-primary/50" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-primary rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
                    </div>
                </div>

                {/* End Handle */}
                <div
                    className={cn(
                        'absolute top-0 bottom-0 w-4 cursor-ew-resize group z-10',
                        isDragging === 'end' && 'cursor-grabbing'
                    )}
                    style={{ left: `calc(${getPositionFromTime(endTime)}% - 8px)` }}
                    onMouseDown={handleMouseDown('end')}
                >
                    <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-primary rounded-full group-hover:w-1.5 transition-all shadow-lg shadow-primary/50" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-primary rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
                    </div>
                </div>

                {/* Playhead */}
                <div
                    className={cn(
                        'absolute top-0 bottom-0 w-4 cursor-ew-resize z-20',
                        isDragging === 'playhead' && 'cursor-grabbing'
                    )}
                    style={{ left: `calc(${getPositionFromTime(currentTime)}% - 8px)` }}
                    onMouseDown={handleMouseDown('playhead')}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2">
                        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-accent" />
                    </div>
                    <div className="absolute top-2 bottom-0 left-1/2 w-0.5 bg-accent -translate-x-1/2 shadow-lg shadow-accent/50" />
                </div>
            </div>

            {/* Duration Info */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                <span>Start: {formatTime(startTime)}</span>
                <span className="text-primary font-semibold">
                    Duration: {formatTime(endTime - startTime)}
                </span>
                <span>End: {formatTime(endTime)}</span>
            </div>
        </div>
    )
}
