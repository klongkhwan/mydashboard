import { MarketOverviewTabs, type MarketOverviewTab } from "@/components/stocks/market-overview-tabs"
import { PageHeader } from "@/components/stocks/section-panel"

interface StocksPageProps {
  searchParams?: Promise<{ tab?: string }>
}

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const { tab } = (await searchParams) ?? {}
  const defaultTab: MarketOverviewTab = tab === "heatmap" ? "heatmap" : "overview"

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8">
      <PageHeader
        eyebrow="Investment"
        title="Market Overview"
        description="Key market indices, daily performance, and sector heatmaps in one view."
      />
      <MarketOverviewTabs defaultTab={defaultTab} />
    </div>
  )
}
