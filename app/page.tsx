"use client"

import { ModernPageLoading } from "@/components/ui/modern-loader"

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ModernPageLoading />
      <meta httpEquiv="refresh" content="0;url=/login" />
    </div>
  )
}
