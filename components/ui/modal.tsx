"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Loading } from "@/components/ui/loading"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ModalProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    title: string
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
    // Action buttons
    showSaveButton?: boolean
    saveButtonText?: string
    saveButtonLoading?: boolean
    onSave?: () => void
    showCancelButton?: boolean
    cancelButtonText?: string
    onCancel?: () => void
    // Styling
    size?: "sm" | "md" | "lg" | "xl" | "full"
    variant?: "default" | "primary" | "success" | "warning" | "danger"
    className?: string
}

const sizeClasses = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-[95vw]",
}

const variantClasses = {
    default: {
        header: "bg-card border-b border-border",
        border: "border-border",
        accent: "text-muted-foreground",
    },
    primary: {
        header: "bg-gradient-to-r from-[#39FF14] to-[#10B981] text-[#0D0F0D]",
        border: "border-[#39FF14]/50",
        accent: "text-[#39FF14]",
    },
    success: {
        header: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white",
        border: "border-emerald-500/50",
        accent: "text-emerald-300",
    },
    warning: {
        header: "bg-gradient-to-r from-amber-600 to-amber-500 text-white",
        border: "border-amber-500/50",
        accent: "text-amber-300",
    },
    danger: {
        header: "bg-gradient-to-r from-red-600 to-red-500 text-white",
        border: "border-red-500/50",
        accent: "text-red-300",
    },
}

export function Modal({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    children,
    footer,
    showSaveButton = true,
    saveButtonText = "บันทึก",
    saveButtonLoading = false,
    onSave,
    showCancelButton = true,
    cancelButtonText = "ยกเลิก",
    onCancel,
    size = "md",
    variant = "default",
    className,
}: ModalProps) {
    const variantStyle = variantClasses[variant]
    const isColoredHeader = variant !== "default"
    const isPrimaryVariant = variant === "primary"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                showCloseButton={false}
                className={cn(
                    sizeClasses[size],
                    "p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]",
                    "bg-card",
                    "shadow-lg shadow-black/20",
                    "border",
                    variantStyle.border,
                    className
                )}
            >
                {/* Header */}
                <div
                    className={cn(
                        "relative px-6 py-4",
                        variantStyle.header
                    )}
                >
                    <DialogHeader className="pr-8">
                        <DialogTitle
                            className={cn(
                                "text-lg font-semibold",
                                isPrimaryVariant ? "text-[#0D0F0D]" : isColoredHeader ? "text-white" : ""
                            )}
                        >
                            {title}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Close Button */}
                    <DialogClose
                        className={cn(
                            "absolute right-4 top-4 rounded-full p-1.5 transition-all",
                            "hover:scale-110 active:scale-95",
                            isPrimaryVariant
                                ? "text-[#0D0F0D]/80 hover:text-[#0D0F0D] hover:bg-[#0D0F0D]/20"
                                : isColoredHeader
                                    ? "text-white/80 hover:text-white hover:bg-white/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <XIcon className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </div>

                {/* Body */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {(footer || showSaveButton || showCancelButton) && (
                    <DialogFooter
                        className={cn(
                            "px-6 py-4 bg-muted/30 mt-auto",
                            "border-t",
                            "flex gap-2"
                        )}
                    >
                        {footer ? (
                            footer
                        ) : (
                            <>
                                {showCancelButton && (
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={onCancel}
                                        >
                                            {cancelButtonText}
                                        </Button>
                                    </DialogClose>
                                )}
                                {showSaveButton && (
                                    <Button
                                        type="button"
                                        onClick={onSave}
                                        disabled={saveButtonLoading}
                                        className={cn(
                                            variant === "primary" && "bg-blue-600 hover:bg-blue-700",
                                            variant === "success" && "bg-emerald-600 hover:bg-emerald-700",
                                            variant === "warning" && "bg-amber-600 hover:bg-amber-700",
                                            variant === "danger" && "bg-red-600 hover:bg-red-700"
                                        )}
                                    >
                                        {saveButtonLoading && (
                                            <Loading variant="spinner" size="sm" className="mr-2" />
                                        )}
                                        {saveButtonText}
                                    </Button>
                                )}
                            </>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

// Re-export dialog components for flexibility
export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
}
