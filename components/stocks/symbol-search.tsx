"use client"

import { Loader2, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export interface SymbolSuggestion {
  symbol: string
  exchange: string
  value: string
  description: string
  type: string
  currency: string
}

interface SymbolSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect: (value: string) => void
}

export function SymbolSearch({ value, onChange, onSelect }: SymbolSearchProps) {
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const wrapper = useRef<HTMLDivElement>(null)
  // Flagged by the input's own onChange, then consumed by the effect below, so each value
  // change is attributed to its origin. Without it the initial value and every programmatic
  // change (watchlist chip, committed suggestion) searched and popped the list open unprompted.
  const typedByUser = useRef(false)

  useEffect(() => {
    const fromInput = typedByUser.current
    typedByUser.current = false
    if (!fromInput) { setSuggestions([]); setOpen(false); setLoading(false); return }

    const query = value.trim()
    if (query.length < 1) { setSuggestions([]); setLoading(false); return }

    // Debounced so a burst of keystrokes costs one request, and aborted so a slow early
    // response cannot overwrite the results for what is now in the box.
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}&limit=5`, { signal: controller.signal })
        const payload = (await response.json()) as { results?: SymbolSuggestion[] }
        setSuggestions(payload.results ?? [])
        setHighlighted(0)
        setOpen(true)
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 220)

    return () => { clearTimeout(timer); controller.abort() }
  }, [value])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  const commit = (next: string) => {
    onChange(next)
    onSelect(next)
    setOpen(false)
    setSuggestions([])
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); return }
    const visible = open && suggestions.length > 0
    if (event.key === "ArrowDown" && visible) { event.preventDefault(); setHighlighted((index) => (index + 1) % suggestions.length); return }
    if (event.key === "ArrowUp" && visible) { event.preventDefault(); setHighlighted((index) => (index - 1 + suggestions.length) % suggestions.length); return }
    if (event.key === "Enter") {
      event.preventDefault()
      commit(visible ? suggestions[highlighted].value : value.trim().toUpperCase())
    }
  }

  return (
    <div className="relative w-full" ref={wrapper}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3b3b3]" />
      <input
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-label="Search symbol"
        className="h-10 w-full rounded-md bg-[#282828] pl-9 pr-9 text-sm text-white outline-none placeholder:text-[#6a6a6a] focus:ring-1 focus:ring-primary"
        onChange={(event) => { typedByUser.current = true; onChange(event.target.value) }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        onKeyDown={onKeyDown}
        placeholder="Search e.g. GOOG, PTT"
        role="combobox"
        value={value}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#6a6a6a]" />}

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-2xl" role="listbox">
          {suggestions.map((item, index) => (
            <li key={item.value} role="option" aria-selected={index === highlighted}>
              <button
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${index === highlighted ? "bg-white/10" : "hover:bg-white/5"}`}
                onClick={() => commit(item.value)}
                onMouseEnter={() => setHighlighted(index)}
                type="button"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{item.symbol}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[#6a6a6a]">{item.exchange}</span>
                </span>
                <span className="line-clamp-1 text-xs text-[#b3b3b3]">{item.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
