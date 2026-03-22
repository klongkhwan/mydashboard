'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    SkipBack,
    SkipForward,
} from 'lucide-react'
import { formatTime } from '@/types/video-editor'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
    src: string | null
    className?: string
    onTimeUpdate?: (currentTime: number, duration: number) => void
    onLoadedMetadata?: (duration: number) => void
    seekTo?: number
}

export function VideoPlayer({
    src,
    className,
    onTimeUpdate,
    onLoadedMetadata,
    seekTo,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Handle external seek
    useEffect(() => {
        if (seekTo !== undefined && videoRef.current) {
            videoRef.current.currentTime = seekTo
        }
    }, [seekTo])

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime
            setCurrentTime(time)
            onTimeUpdate?.(time, duration)
        }
    }, [duration, onTimeUpdate])

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            const dur = videoRef.current.duration
            setDuration(dur)
            onLoadedMetadata?.(dur)
        }
    }, [onLoadedMetadata])

    const togglePlay = () => {
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
        } else {
            videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (value: number[]) => {
        if (videoRef.current) {
            videoRef.current.currentTime = value[0]
            setCurrentTime(value[0])
        }
    }

    const handleVolumeChange = (value: number[]) => {
        if (videoRef.current) {
            const vol = value[0]
            videoRef.current.volume = vol
            setVolume(vol)
            setIsMuted(vol === 0)
        }
    }

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    const toggleFullscreen = () => {
        if (!containerRef.current) return
        if (!isFullscreen) {
            containerRef.current.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
        setIsFullscreen(!isFullscreen)
    }

    const skipBack = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, currentTime - 10)
        }
    }

    const skipForward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, currentTime + 10)
        }
    }

    const handleEnded = () => {
        setIsPlaying(false)
    }

    if (!src) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center rounded-xl bg-card border border-border aspect-video',
                    className
                )}
            >
                <div className="text-center text-muted-foreground">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>เลือกวิดีโอเพื่อเริ่มเล่น</p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative rounded-xl overflow-hidden bg-black group',
                className
            )}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={src}
                className="w-full aspect-video object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onClick={togglePlay}
            />

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Time Slider */}
                <div className="mb-3">
                    <Slider
                        value={[currentTime]}
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Skip Back */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={skipBack}
                            className="text-white hover:bg-white/20"
                        >
                            <SkipBack className="w-4 h-4" />
                        </Button>

                        {/* Play/Pause */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlay}
                            className="text-white hover:bg-white/20"
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5" />
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                        </Button>

                        {/* Skip Forward */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={skipForward}
                            className="text-white hover:bg-white/20"
                        >
                            <SkipForward className="w-4 h-4" />
                        </Button>

                        {/* Time Display */}
                        <span className="text-white text-sm font-mono ml-2">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Volume */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                            className="text-white hover:bg-white/20"
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </Button>
                        <div className="w-24">
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                min={0}
                                max={1}
                                step={0.1}
                                onValueChange={handleVolumeChange}
                            />
                        </div>

                        {/* Fullscreen */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="text-white hover:bg-white/20"
                        >
                            <Maximize className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Center Play Button (when paused) */}
            {!isPlaying && (
                <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className="w-20 h-20 rounded-full bg-primary/80 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-primary/40 hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                </div>
            )}
        </div>
    )
}
