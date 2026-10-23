"use client"

import { useEffect, useRef, useState } from "react"

interface TradingViewElementProps {
  script: string
  tag: string
  attributes?: Record<string, string>
  className?: string
}

const loadedScripts = new Map<string, Promise<void>>()

export function TradingViewElement({ script, tag, attributes = {}, className }: TradingViewElementProps) {
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  // `attributes` is an inline object at every call site, so a reference dependency re-created
  // the custom element on every parent render and restarted the widget mid-load.
  const attributeKey = JSON.stringify(attributes)

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    let loading = loadedScripts.get(script)
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const scriptElement = document.createElement("script")
        scriptElement.type = "module"
        scriptElement.src = script
        scriptElement.onload = () => resolve()
        scriptElement.onerror = () => reject(new Error(`Unable to load ${script}`))
        document.head.appendChild(scriptElement)
      })
      // A failed load must not be cached, or every later mount reuses the rejection.
      loading.catch(() => loadedScripts.delete(script))
      loadedScripts.set(script, loading)
    }
    loading.then(async () => {
      await customElements.whenDefined(tag)
      if (cancelled) return
      const element = document.createElement(tag)
      Object.entries(JSON.parse(attributeKey) as Record<string, string>).forEach(([name, value]) => element.setAttribute(name, value))
      container.current?.replaceChildren(element)
      setStatus("ready")
    }).catch(() => { if (!cancelled) { container.current?.replaceChildren(); setStatus("error") } })
    return () => { cancelled = true; container.current?.replaceChildren() }
  }, [attributeKey, script, tag])

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={container} />
      {status !== "ready" && (
        <div className="grid min-h-[180px] place-items-center">
          {status === "error" ? (
            <p className="text-xs text-muted-foreground">Widget failed to load. Check your connection and try again.</p>
          ) : (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
          )}
        </div>
      )}
    </div>
  )
}
