"use client"

import { useState, useEffect } from "react"

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  const toggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
  }

  return {
    isCollapsed,
    toggle,
  }
}
