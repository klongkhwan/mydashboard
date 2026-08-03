'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PdfToolCardProps {
    icon: LucideIcon
    title: string
    description: string
    disabled?: boolean
    onClick?: () => void
}

export function PdfToolCard({ icon: Icon, title, description, disabled, onClick }: PdfToolCardProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'group flex h-full flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all',
                disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
            )}
        >
            <div
                className={cn(
                    'rounded-lg bg-primary/10 p-2.5 text-primary transition-colors',
                    !disabled && 'group-hover:bg-primary/20'
                )}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    {disabled && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            เร็ว ๆ นี้
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </button>
    )
}
