"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ModernLoadingProps {
    className?: string
    text?: string // Text is optional, can be omitted for extreme minimalism
}

export function ModernPageLoading({ className, text }: ModernLoadingProps) {
    return (
        <div className={cn("min-h-[200px] flex flex-col items-center justify-center bg-transparent", className)}>
            <div className="relative flex items-center justify-center">
                {/* Track */}
                <div className="absolute w-8 h-8 rounded-full border-[2px] border-secondary/30" />

                {/* Rotating Arc */}
                <div className="absolute w-8 h-8 rounded-full border-[2px] border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>

            {/* Optional minimal text - only if provided */}
            {text && (
                <span className="mt-4 text-[10px] text-muted-foreground font-medium uppercase tracking-widest animate-pulse">
                    {text}
                </span>
            )}
        </div>
    )
}
