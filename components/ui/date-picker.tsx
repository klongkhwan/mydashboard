"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    defaultValue?: string | Date
    name?: string
    required?: boolean
    placeholder?: string
    className?: string
    disabled?: boolean
}

const parseDateValue = (val: string | Date | undefined): Date | undefined => {
    if (!val) return undefined
    if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val
    if (typeof val === "string") {
        const trimmed = val.trim()
        const parts = trimmed.slice(0, 10).split("-")
        if (parts.length === 3 && parts[0].length === 4) {
            const year = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            const day = parseInt(parts[2], 10)
            const d = new Date(year, month, day)
            return isNaN(d.getTime()) ? undefined : d
        }
        const d = new Date(trimmed)
        return isNaN(d.getTime()) ? undefined : d
    }
    return undefined
}

export function DatePicker({
    value,
    onChange,
    defaultValue,
    name,
    required = false,
    placeholder = "DD/MM/YYYY",
    className,
    disabled = false,
}: DatePickerProps) {
    const isControlled = value !== undefined
    const [internalDate, setInternalDate] = React.useState<Date | undefined>(() =>
        parseDateValue(defaultValue)
    )
    const [open, setOpen] = React.useState(false)

    // Sync defaultValue changes if uncontrolled
    React.useEffect(() => {
        if (!isControlled && defaultValue !== undefined) {
            setInternalDate(parseDateValue(defaultValue))
        }
    }, [defaultValue, isControlled])

    const currentDate = isControlled ? value : internalDate

    const handleSelect = (selected: Date | undefined) => {
        if (!isControlled) {
            setInternalDate(selected)
        }
        onChange?.(selected)
        setOpen(false)
    }

    const formattedHiddenValue = currentDate ? format(currentDate, "yyyy-MM-dd") : ""

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start text-left font-normal h-9 rounded-lg border border-white/10 bg-[#181818] px-3 text-xs text-white shadow-xs transition hover:border-white/20 hover:bg-[#202020] hover:text-white focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer",
                            !currentDate && "text-white/40",
                            className
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-white/50" />
                        {currentDate ? (
                            <span className="tabular-nums font-medium">{format(currentDate, "dd/MM/yyyy")}</span>
                        ) : (
                            <span className="text-white/40">{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0 z-50 bg-[#181818] border border-white/10 text-white shadow-xl"
                    align="start"
                >
                    <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={handleSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={formattedHiddenValue}
                    required={required}
                />
            )}
        </div>
    )
}
