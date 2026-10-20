import { format } from "date-fns"

export function formatMoney(amountThb: number, currency: "THB" | "USD" = "THB", rate = 34.0): string {
  if (isNaN(amountThb) || amountThb == null) return currency === "USD" ? "$0.00" : "฿0"
  if (currency === "USD") {
    const r = rate > 0 ? rate : 34.0
    const usdVal = amountThb / r
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usdVal)
  }
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amountThb)
}

export function money(amount: number, currency: "THB" | "USD" = "THB", rate = 34.0): string {
  return formatMoney(amount, currency, rate)
}

export function compactMoney(amountThb: number, currency: "THB" | "USD" = "THB", rate = 34.0): string {
  if (isNaN(amountThb) || amountThb == null) return "0"
  if (currency === "USD") {
    const r = rate > 0 ? rate : 34.0
    const usdVal = amountThb / r
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(usdVal)
  }
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountThb)
}

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
]

export function formatThaiMonth(monthKey: string, includeYear = false): string {
  if (!monthKey || !monthKey.includes("-")) return monthKey
  const [yearStr, monthStr] = monthKey.split("-")
  const monthIdx = parseInt(monthStr, 10) - 1
  const monthName = THAI_MONTHS_SHORT[monthIdx] || monthStr
  if (!includeYear) return monthName
  const year = parseInt(yearStr, 10) + 543
  return `${monthName} ${String(year).slice(-2)}`
}

export function formatThaiDate(dateStr: string, options?: { includeYear?: boolean }): string {
  if (!dateStr) return ""
  // Handle ISO or YYYY-MM-DD
  const dateOnly = dateStr.slice(0, 10)
  const parts = dateOnly.split("-")
  if (parts.length !== 3) return dateStr
  const [yearStr, monthStr, dayStr] = parts
  const day = parseInt(dayStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  const monthName = THAI_MONTHS_SHORT[monthIdx] || monthStr
  if (options?.includeYear) {
    const year = parseInt(yearStr, 10) + 543
    return `${day} ${monthName} ${year}`
  }
  return `${day} ${monthName}`
}

export function formatPercent(val: number | null): string {
  if (val == null || isNaN(val)) return "—"
  const sign = val > 0 ? "+" : ""
  return `${sign}${val.toFixed(1)}%`
}

/**
 * Format a Date object, ISO string, or YYYY-MM-DD string to DD/MM/YYYY
 */
export function formatDateDDMMYYYY(date: Date | string | null | undefined): string {
  if (!date) return "-"
  if (typeof date === "string") {
    const trimmed = date.trim()
    if (!trimmed) return "-"
    const parts = trimmed.slice(0, 10).split("-")
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts
      return `${day}/${month}/${year}`
    }
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? trimmed : format(d, "dd/MM/yyyy")
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    return format(date, "dd/MM/yyyy")
  }
  return "-"
}

