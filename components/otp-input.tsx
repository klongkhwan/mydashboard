"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

interface OTPInputProps {
  length: number
  onComplete: (code: string) => void
  className?: string
  showPassword?: boolean
  onTogglePassword?: () => void
}

export function OTPInput({ length, onComplete, className, showPassword = false, onTogglePassword }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(new Array(length).fill(""))
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
      setFocusedIndex(0)
    }
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newValues = [...values]
    newValues[index] = value
    setValues(newValues)

    // Move to next input if value is entered
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
      setFocusedIndex(index + 1)
    }

    // Check if complete and auto-login
    if (newValues.every((v) => v !== "") && newValues.join("").length === length) {
      const code = newValues.join("")
      // Add a small delay to show the last digit before auto-login
      setTimeout(() => {
        onComplete(code)
      }, 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!values[index] && index > 0) {
        // If current input is empty, move to previous and clear it
        const newValues = [...values]
        newValues[index - 1] = ""
        setValues(newValues)
        inputRefs.current[index - 1]?.focus()
        setFocusedIndex(index - 1)
      } else if (values[index]) {
        // If current input has value, clear it
        const newValues = [...values]
        newValues[index] = ""
        setValues(newValues)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setFocusedIndex(index - 1)
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
      setFocusedIndex(index + 1)
    }
  }

  const handleFocus = (index: number) => {
    setFocusedIndex(index)
  }

  const handleClick = (index: number) => {
    inputRefs.current[index]?.focus()
    setFocusedIndex(index)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, length)
    const newValues = [...values]

    for (let i = 0; i < pastedData.length && i < length; i++) {
      newValues[i] = pastedData[i]
    }

    setValues(newValues)

    if (newValues.every((v) => v !== "")) {
      onComplete(newValues.join(""))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center gap-4">
        <div className={cn("flex gap-3", className)}>
          {values.map((value, index) => (
            <div
              key={index}
              className="relative cursor-pointer"
              onClick={() => handleClick(index)}
            >
              <input
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={() => handleFocus(index)}
                onPaste={handlePaste}
                className={cn(
                  "w-12 h-12 text-center text-lg font-mono bg-input border rounded-lg transition-all",
                  {
                    "border-ring ring-2 ring-ring": focusedIndex === index,
                    "border-border": focusedIndex !== index,
                    "text-transparent": !showPassword && value,
                    "text-foreground": showPassword || !value
                  }
                )}
                placeholder={focusedIndex === index ? "" : "•"}
              />
              {/* Display masked dots when password is hidden and there's a value */}
              {!showPassword && value && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg text-foreground">•</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors h-6 px-2 rounded-sm hover:bg-muted/50"
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showPassword ? "ซ่อน" : "แสดง"}</span>
          </button>
        )}
      </div>
    </div>
  )
}
