"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DatePickerProps extends Pick<React.ComponentProps<typeof Button>, "id" | "aria-invalid" | "aria-describedby"> {
    value?: Date
    onChange?: (date: Date | undefined) => void
    defaultValue?: string | Date
    name?: string
    required?: boolean
    placeholder?: string
    className?: string
    disabled?: boolean
    maxDate?: Date
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
    maxDate,
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
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
                        id={id}
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedBy}
                        className={cn(
                            "w-full justify-start text-left font-normal h-control rounded-md border border-input bg-background px-3 text-sm text-foreground hover:bg-muted cursor-pointer",
                            "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
                            !currentDate && "text-muted-foreground",
                            className
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        {currentDate ? (
                            <span className="tabular-nums font-medium">{format(currentDate, "dd/MM/yyyy")}</span>
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0"
                    align="start"
                >
                    <Calendar
                        style={{
                            "--rdp-day-width": "min(44px, calc((100vw - 4rem) / 7))",
                            "--rdp-day_button-width": "min(42px, calc((100vw - 4rem) / 7))",
                        } as React.CSSProperties}
                        mode="single"
                        selected={currentDate}
                        required={required}
                        disabled={maxDate ? { after: maxDate } : undefined}
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
