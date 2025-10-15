import { supabase } from './supabase'
import { Trade, TradeForm, TradeFilters, TradeStatistics, Market } from '@/types/trading'

export async function getTrades(filters?: TradeFilters) {
  let query = supabase
    .from('trades_simple')
    .select('*')
    .order('entry_date', { ascending: false })

  if (filters) {
    if (filters.date_from) {
      query = query.gte('entry_date', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('entry_date', filters.date_to)
    }
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol)
    }
    if (filters.market) {
      query = query.eq('market', filters.market)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.timeframe) {
      query = query.eq('timeframe', filters.timeframe)
    }
    if (filters.entry_emotion) {
      query = query.eq('entry_emotion', filters.entry_emotion)
    }
    if (filters.exit_emotion) {
      query = query.eq('exit_emotion', filters.exit_emotion)
    }
    if (filters.account_name) {
      query = query.eq('account_name', filters.account_name)
    }
    if (filters.search) {
      query = query.or(`symbol.ilike.%${filters.search}%,entry_reason.ilike.%${filters.search}%,exit_reason.ilike.%${filters.search}%,learning_note.ilike.%${filters.search}%,account_name.ilike.%${filters.search}%`)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data as Trade[]
}


export async function createTrade(trade: TradeForm) {
  const { data, error } = await supabase
    .from('trades_simple')
    .insert([{
      ...trade,
      user_id: "authenticated-user" // Use TEXT user_id to match table schema
    }])
    .select()
    .single()

  if (error) throw error
  return data as Trade
}

export async function updateTrade(id: string, trade: Partial<TradeForm>) {
  const { data, error } = await supabase
    .from('trades_simple')
    .update(trade)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Trade
}

export async function deleteTrade(id: string) {
  const { error } = await supabase
    .from('trades_simple')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getTradeById(id: string) {
  const { data, error } = await supabase
    .from('trades_simple')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Trade
}

export async function calculateTradeStatistics(filters?: TradeFilters): Promise<TradeStatistics> {
  const trades = await getTrades(filters)
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.profit_loss !== null)

  if (closedTrades.length === 0) {
    return {
      total_trades: trades.length,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_profit_loss: 0,
      total_profit: 0,
      total_loss: 0,
      average_win: 0,
      average_loss: 0,
      profit_factor: 0,
      max_drawdown: 0,
      expectancy: 0,
      largest_win: 0,
      largest_loss: 0,
      market_performance: {
        spot: { trades: 0, profit_loss: 0, win_rate: 0 },
        futures: { trades: 0, profit_loss: 0, win_rate: 0 },
        margin: { trades: 0, profit_loss: 0, win_rate: 0 }
      }
    }
  }

  const winningTrades = closedTrades.filter(trade => (trade.profit_loss || 0) > 0)
  const losingTrades = closedTrades.filter(trade => (trade.profit_loss || 0) < 0)

  const totalProfit = winningTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0))
  const totalProfitLoss = closedTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

  const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0
  const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0

  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
  const expectancy = closedTrades.length > 0 ? totalProfitLoss / closedTrades.length : 0

  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit_loss || 0)) : 0
  const largestLoss = losingTrades.length > 0 ? Math.abs(Math.min(...losingTrades.map(t => t.profit_loss || 0))) : 0

  // Calculate max drawdown
  let maxDrawdown = 0
  let peak = 0
  let cumulative = 0

  closedTrades.forEach(trade => {
    cumulative += trade.profit_loss || 0
    if (cumulative > peak) {
      peak = cumulative
    }
    const drawdown = peak - cumulative
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  })

  // Calculate market performance
  const marketPerformance = {
    spot: { trades: 0, profit_loss: 0, win_rate: 0 },
    futures: { trades: 0, profit_loss: 0, win_rate: 0 },
    margin: { trades: 0, profit_loss: 0, win_rate: 0 }
  }

  const marketTypes: Market[] = ['spot', 'futures', 'margin']
  marketTypes.forEach(market => {
    const marketTrades = closedTrades.filter(trade => trade.market === market)
    const marketWins = marketTrades.filter(trade => (trade.profit_loss || 0) > 0)
    const marketPL = marketTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

    marketPerformance[market] = {
      trades: marketTrades.length,
      profit_loss: marketPL,
      win_rate: marketTrades.length > 0 ? (marketWins.length / marketTrades.length) * 100 : 0
    }
  })

  return {
    total_trades: trades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    total_profit_loss: totalProfitLoss,
    total_profit: totalProfit,
    total_loss: totalLoss,
    average_win: averageWin,
    average_loss: averageLoss,
    profit_factor,
    max_drawdown,
    expectancy,
    largest_win,
    largest_loss,
    market_performance
  }
}

export async function getUniqueSymbols() {
  const { data, error } = await supabase
    .from('trades_simple')
    .select('symbol')
    .not('symbol', 'is', null)

  if (error) throw error
  return [...new Set(data.map(item => item.symbol))]
}

export async function getUniqueTimeframes() {
  const { data, error } = await supabase
    .from('trades_simple')
    .select('timeframe')
    .not('timeframe', 'is', null)

  if (error) throw error
  return [...new Set(data.map(item => item.timeframe).filter(Boolean))]
}

export async function getUniqueAccountNames() {
  const { data, error } = await supabase
    .from('trades_simple')
    .select('account_name')
    .not('account_name', 'is', null)

  if (error) throw error
  return [...new Set(data.map(item => item.account_name).filter(Boolean))]
}