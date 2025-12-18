"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Select date",
    className,
    disabled = false,
}: DatePickerProps) {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Format date to YYYY-MM-DD for input type="date"
    const formattedValue = value ? format(value, "yyyy-MM-dd") : ""

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value
        if (!dateString) {
            onChange?.(undefined)
            return
        }
        const parsed = parse(dateString, "yyyy-MM-dd", new Date())
        if (isValid(parsed)) {
            onChange?.(parsed)
        }
    }

    return (
        <div className={cn("relative", className)}>
            <input
                ref={inputRef}
                type="date"
                value={formattedValue}
                onChange={handleChange}
                onClick={() => inputRef.current?.showPicker()}
                disabled={disabled}
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors cursor-pointer",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:bg-input/30 dark:border-input"
                )}
            />
        </div>
    )
}
