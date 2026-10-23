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
    default: "bg-card text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                {...(!description && { 'aria-describedby': undefined })}
                showCloseButton={false}
                className={cn(
                    sizeClasses[size],
                    "p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]",
                    className
                )}
            >
                {/* Header */}
                <div
                    className={cn(
                        "relative px-6 py-4 border-b border-border",
                        variantStyle
                    )}
                >
                    <DialogHeader className="pr-8">
                        <DialogTitle
                            className="text-lg font-semibold text-current"
                        >
                            {title}
                        </DialogTitle>
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>

                    {/* Close Button */}
                    <DialogClose
                        className="absolute right-4 top-4 rounded-full p-1.5 text-current transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
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
                                        aria-busy={saveButtonLoading}
                                        variant={variant === "danger" ? "destructive" : "default"}
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
