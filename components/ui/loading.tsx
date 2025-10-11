"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl"
  text?: string
  className?: string
  variant?: "spinner" | "dots" | "pulse" | "skeleton"
  fullScreen?: boolean
}

const LoadingSpinner = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  }

  return (
    <div className={cn("animate-spin", sizeClasses[size], className)}>
      <div className="w-full h-full border-2 border-current border-t-transparent rounded-full"></div>
    </div>
  )
}

const LoadingDots = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) => {
  const sizeClasses = {
    sm: "w-1 h-1",
    md: "w-2 h-2",
    lg: "w-3 h-3",
    xl: "w-4 h-4"
  }

  return (
    <div className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-current rounded-full animate-bounce",
            sizeClasses[size]
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}

const LoadingPulse = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) => {
  const sizeClasses = {
    sm: "w-8 h-4",
    md: "w-12 h-6",
    lg: "w-16 h-8",
    xl: "w-24 h-12"
  }

  return (
    <div className={cn("bg-muted rounded-lg animate-pulse", sizeClasses[size], className)} />
  )
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div className={cn("animate-pulse bg-muted rounded-lg", className)} />
  )
}

export function Loading({
  size = "md",
  text,
  className,
  variant = "spinner",
  fullScreen = false
}: LoadingProps) {
  const content = (
    <div className={cn(
      "flex items-center justify-center",
      text && "gap-3",
      fullScreen && "min-h-screen bg-background",
      className
    )}>
      {variant === "spinner" && <LoadingSpinner size={size} />}
      {variant === "dots" && <LoadingDots size={size} />}
      {variant === "pulse" && <LoadingPulse size={size} />}
      {variant === "skeleton" && <LoadingSkeleton className={cn(
        size === "sm" && "w-8 h-4",
        size === "md" && "w-12 h-6",
        size === "lg" && "w-16 h-8",
        size === "xl" && "w-24 h-12"
      )} />}

      {text && (
        <span className={cn(
          "text-muted-foreground",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base",
          size === "xl" && "text-lg"
        )}>
          {text}
        </span>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}

// Specialized loading components
export const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <LoadingSpinner size="xl" />
      <p className="text-muted-foreground animate-pulse">กำลังโหลด...</p>
    </div>
  </div>
)

export const ButtonLoading = ({ text = "กำลังดำเนินการ..." }: { text?: string }) => (
  <div className="flex items-center gap-2">
    <LoadingSpinner size="sm" />
    <span>{text}</span>
  </div>
)

export const CardLoading = ({ title = "กำลังโหลด..." }: { title?: string }) => (
  <div className="rounded-lg border border-border p-6 space-y-4">
    <LoadingSkeleton className="w-32 h-6 mb-4" />
    <div className="space-y-2">
      <LoadingSkeleton className="w-full h-4" />
      <LoadingSkeleton className="w-3/4 h-4" />
      <LoadingSkeleton className="w-1/2 h-4" />
    </div>
  </div>
)

export const TableLoading = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-2">
        <LoadingSkeleton className="w-24 h-8" />
        <LoadingSkeleton className="flex-1 h-8" />
        <LoadingSkeleton className="w-32 h-8" />
        <LoadingSkeleton className="w-20 h-8" />
      </div>
    ))}
  </div>
)

// Hook for loading state
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState)

  const startLoading = React.useCallback(() => setIsLoading(true), [])
  const stopLoading = React.useCallback(() => setIsLoading(false), [])
  const toggleLoading = React.useCallback(() => setIsLoading(prev => !prev), [])

  return {
    isLoading,
    setIsLoading,
    startLoading,
    stopLoading,
    toggleLoading
  }
}