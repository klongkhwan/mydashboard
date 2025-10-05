"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface OTPInputProps {
  length: number
  onComplete: (code: string) => void
  className?: string
}

export function OTPInput({ length, onComplete, className }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(new Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newValues = [...values]
    newValues[index] = value
    setValues(newValues)

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if complete
    if (newValues.every((v) => v !== "") && newValues.join("").length === length) {
      onComplete(newValues.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
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
    <div className={cn("flex gap-3", className)}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-lg font-mono bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
      ))}
    </div>
  )
}
