"use client"

import { useEffect, useRef, useState } from "react"

interface TradingViewScriptWidgetProps { script: string; config: Record<string, unknown>; className?: string }

export function TradingViewScriptWidget({ script: source, config, className }: TradingViewScriptWidgetProps) {
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  // Callers build `config` inline, so its identity changes on every render. Depending on the
  // object itself tore the widget down and re-injected the script on each keystroke, and a
  // script still in flight lost its container — that is the widget that spins forever.
  const configKey = JSON.stringify(config)

  useEffect(() => {
    const element = container.current
    if (!element) return
    setStatus("loading")
    element.replaceChildren()

    // The embed script resolves its mount point from its own parent node, so it needs a
    // wrapper that stays attached for the whole load.
    const mount = document.createElement("div")
    element.appendChild(mount)

    const script = document.createElement("script")
    script.src = source
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = configKey
    script.onerror = () => setStatus("error")
    mount.appendChild(script)

    // The script only reports that its own JS loaded; the widget arrives later as an iframe.
    const observer = new MutationObserver(() => { if (mount.querySelector("iframe")) setStatus("ready") })
    observer.observe(mount, { childList: true, subtree: true })

    return () => { observer.disconnect(); element.replaceChildren() }
  }, [configKey, source])

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="h-full w-full" ref={container} />
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center rounded-lg bg-[#0f0f0f]">
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
