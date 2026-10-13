const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat("th-TH", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function money(amount: number): string {
  if (isNaN(amount) || amount == null) return "฿0"
  return currencyFormatter.format(amount)
}

export function compactMoney(amount: number): string {
  if (isNaN(amount) || amount == null) return "0"
  return compactCurrencyFormatter.format(amount)
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
