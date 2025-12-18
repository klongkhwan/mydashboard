export type Market = 'spot' | 'futures' | 'margin'
export type TradeStatus = 'open' | 'closed' | 'cancelled'
export type AccountType = 'demo' | 'live'
export type TradeDirection = 'buy' | 'sell'

export type EmotionType = 'greedy' | 'fearful' | 'confident' | 'anxious' | 'neutral' | 'excited' | 'disappointed' | 'calm'

export interface Trade {
  id: string
  user_id: string
  entry_date: string
  symbol: string
  market: Market
  direction: TradeDirection
  position_size?: number // for futures/margin
  leverage?: number // for futures/margin
  timeframe?: string
  entry_price: number
  capital_amount: number
  entry_emotion?: EmotionType
  entry_reason?: string
  exit_price?: number
  exit_date?: string
  exit_emotion?: EmotionType
  exit_reason?: string
  learning_note?: string
  profit_loss?: number
  profit_loss_percent?: number
  status: TradeStatus
  created_at: string
  updated_at: string
}

export interface TradeForm {
  entry_date: string
  symbol: string
  market: Market
  direction: TradeDirection
  position_size?: string // for futures/margin
  leverage?: string // for futures/margin
  timeframe?: string
  entry_price: string
  capital_amount: string
  entry_emotion?: EmotionType
  entry_reason?: string
  exit_price?: string
  exit_date?: string
  exit_emotion?: EmotionType
  exit_reason?: string
  learning_note?: string
  profit_loss?: number
  profit_loss_percent?: number
  status: TradeStatus
}

export interface TradeFilters {
  date_from?: string
  date_to?: string
  symbol?: string
  market?: Market
  direction?: TradeDirection
  status?: TradeStatus
  timeframe?: string
  entry_emotion?: EmotionType
  exit_emotion?: EmotionType
  search?: string
}

export interface TradeStatistics {
  total_trades: number
  closed_trades: number
  open_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_profit_loss: number
  total_profit: number
  total_loss: number
  average_win: number
  average_loss: number
  profit_factor: number
  max_drawdown: number
  expectancy: number
  largest_win: number
  largest_loss: number

  // Advanced Stats
  current_streak: number
  max_win_streak: number
  max_loss_streak: number
  avg_hold_time_win: number
  avg_hold_time_loss: number

  best_trade: { symbol: string, pnl: number, date: string } | null
  worst_trade: { symbol: string, pnl: number, date: string } | null

  dominant_emotions: {
    entry: { emotion: string, count: number }
    exit: { emotion: string, count: number }
  }

  // Market statistics
  market_performance: Record<Market, {
    trades: number
    profit_loss: number
    win_rate: number
  }>

  // Visual Data
  monthly_pnl: { name: string, value: number, status: 'profit' | 'loss' }[]
  equity_curve: { date: string, pnl: number, rawPnl: number, entry_date: string }[]

  // Open trades breakdown
  open_trades_list: {
    id: string
    symbol: string
    market: Market
    direction: TradeDirection
    entry_price: number
    capital_amount: number
    entry_date: string
    leverage?: number
  }[]
}

export interface MonthlyStats {
  month: string
  profit_loss: number
  trades_count: number
  win_rate: number
}