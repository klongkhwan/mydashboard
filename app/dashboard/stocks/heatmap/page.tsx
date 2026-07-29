import { redirect } from "next/navigation"

// Heatmap now lives as a tab inside Market Overview; keep old links working.
export default function HeatmapPage() {
  redirect("/dashboard/investment?tab=heatmap")
}
