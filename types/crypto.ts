export interface BinanceDataPoint {
  timestamp: number
  sumOpenInterest?: string
  sumOpenInterestValue?: string
  longShortRatio?: string
  longAccount?: string
  shortAccount?: string
  buySellRatio?: string
  buyVol?: string
  sellVol?: string
  basis?: string
  basisRate?: string
  indexPrice?: string
  markPrice?: string
}

export interface TradingDataPoint {
  time: string
  timestamp: number
  openInterest: number
  notionalValue: number
  longShortAccounts: number
  longShortPositions: number
  longShortRatio: number
  takerBuy: number
  takerSell: number
  futuresPrice: number
  priceIndex: number
  basis: number
}

export interface NewsItem {
  id: number
  title: string
  source: string
  time: string
  impact: "high" | "medium" | "low"
  category: string
}

export interface PriceData {
  symbol: string
  name: string
  price: number
  change: number
  volume: string
}

export interface ScannerResult {
  symbol: string
  name: string
  price: number
  change: number
  volume: string
  score: number
  reason: string
}

export interface ScannerFilters {
  minPrice: string
  maxPrice: string
  minVolume: string
  category: string
}