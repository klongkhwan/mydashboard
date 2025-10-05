import { TradingDashboard } from "./TradingDashboard"

interface TradingTabProps {
  symbol: string
  period: string
  onSymbolChange: (symbol: string) => void
  onPeriodChange: (period: string) => void
}

export function TradingTab({ symbol, period, onSymbolChange, onPeriodChange }: TradingTabProps) {
  return <TradingDashboard />
}