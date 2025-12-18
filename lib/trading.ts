"use server"

import { createClient } from "@/utils/supabase/server"
import { Trade, TradeForm, TradeFilters, TradeStatistics, Market } from '@/types/trading'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error("Unauthorized")
  }
  return { user, supabase }
}

export async function getTrades(filters?: TradeFilters) {
  const { user, supabase } = await getAuthenticatedUser()

  let query = supabase
    .from('trades_simple')
    .select('*')
    .eq('user_id', user.id)
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
    if (filters.search) {
      query = query.or(`symbol.ilike.%${filters.search}%,entry_reason.ilike.%${filters.search}%,exit_reason.ilike.%${filters.search}%,learning_note.ilike.%${filters.search}%`)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data as Trade[]
}


export async function createTrade(trade: TradeForm) {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('trades_simple')
    .insert([{
      ...trade,
      user_id: user.id
    }])
    .select()
    .single()

  if (error) throw error
  return data as Trade
}

export async function updateTrade(id: string, trade: Partial<TradeForm>) {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('trades_simple')
    .update(trade)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Trade
}

export async function deleteTrade(id: string) {
  const { user, supabase } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('trades_simple')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function getTradeById(id: string) {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('trades_simple')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data as Trade
}

import { format, differenceInMilliseconds } from "date-fns"

export async function calculateTradeStatistics(filters?: TradeFilters): Promise<TradeStatistics> {
  const trades = await getTrades(filters)

  const openTradesCount = trades.filter(t => t.status === 'open').length
  const closedTrades = trades
    .filter(trade => trade.status === 'closed' && trade.profit_loss !== null)
    .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

  if (closedTrades.length === 0) {
    return {
      total_trades: trades.length,
      closed_trades: 0,
      open_trades: openTradesCount,
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
      current_streak: 0,
      max_win_streak: 0,
      max_loss_streak: 0,
      avg_hold_time_win: 0,
      avg_hold_time_loss: 0,
      best_trade: null,
      worst_trade: null,
      dominant_emotions: { entry: { emotion: '-', count: 0 }, exit: { emotion: '-', count: 0 } },
      market_performance: {
        spot: { trades: 0, profit_loss: 0, win_rate: 0 },
        futures: { trades: 0, profit_loss: 0, win_rate: 0 },
        margin: { trades: 0, profit_loss: 0, win_rate: 0 }
      },
      monthly_pnl: [],
      equity_curve: [],
      open_trades_list: trades.filter(t => t.status === 'open').map(t => ({
        id: t.id,
        symbol: t.symbol,
        market: t.market,
        direction: t.direction,
        entry_price: t.entry_price,
        capital_amount: t.capital_amount,
        entry_date: t.entry_date,
        leverage: t.leverage
      }))
    }
  }

  const winningTrades = closedTrades.filter(trade => (trade.profit_loss || 0) > 0)
  const losingTrades = closedTrades.filter(trade => (trade.profit_loss || 0) < 0)

  const totalProfit = winningTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0))
  const totalProfitLoss = closedTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0)

  const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0
  const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0

  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 100 : 0
  const expectancy = closedTrades.length > 0 ? totalProfitLoss / closedTrades.length : 0

  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit_loss || 0)) : 0
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profit_loss || 0)) : 0

  // Find Best/Worst Trade Details (Objects not just numbers)
  const bestTradeObj = winningTrades.reduce((best, t) => (!best || (t.profit_loss || 0) > (best.profit_loss || 0)) ? t : best, null as Trade | null)
  const worstTradeObj = losingTrades.reduce((worst, t) => (!worst || (t.profit_loss || 0) < (worst.profit_loss || 0)) ? t : worst, null as Trade | null)

  const bestTrade = bestTradeObj ? { symbol: bestTradeObj.symbol, pnl: bestTradeObj.profit_loss!, date: bestTradeObj.entry_date } : null
  const worstTrade = worstTradeObj ? { symbol: worstTradeObj.symbol, pnl: worstTradeObj.profit_loss!, date: worstTradeObj.entry_date } : null

  // Streak Calculation
  let maxWinStreak = 0, maxLossStreak = 0
  let currentWinStreak = 0, currentLossStreak = 0
  let currentStreak = 0

  closedTrades.forEach(t => {
    const pnl = t.profit_loss || 0
    if (pnl > 0) {
      currentWinStreak++
      currentLossStreak = 0
      if (currentStreak < 0) currentStreak = 0
      currentStreak++
    } else if (pnl < 0) {
      currentLossStreak++
      currentWinStreak = 0
      if (currentStreak > 0) currentStreak = 0
      currentStreak--
    }
    if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak
    if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak
  })

  // Calculations for Hold Time
  const calculateAvgHoldTime = (list: Trade[]) => {
    if (list.length === 0) return 0
    const totalMs = list.reduce((sum, t) => {
      if (!t.exit_date) return sum
      return sum + differenceInMilliseconds(new Date(t.exit_date), new Date(t.entry_date))
    }, 0)
    return totalMs / list.length
  }
  const avgHoldTimeWin = calculateAvgHoldTime(winningTrades)
  const avgHoldTimeLoss = calculateAvgHoldTime(losingTrades)

  // Max Drawdown & Equity Curve
  let maxDrawdown = 0
  let peak = 0
  let cumulative = 0

  // Aggregate trades by date (YYYY-MM-DD)
  const dailyPnLMap = closedTrades.reduce((acc, trade) => {
    const dateKey = format(new Date(trade.entry_date), 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = {
        dateStr: format(new Date(trade.entry_date), 'dd MMM'),
        entry_date: trade.entry_date, // Keep one timestamp for sorting
        pnl: 0
      }
    }
    acc[dateKey].pnl += (trade.profit_loss || 0)
    return acc
  }, {} as Record<string, { dateStr: string, entry_date: string, pnl: number }>)

  // Convert to array and sort by date
  const sortedDailyPnL = Object.values(dailyPnLMap).sort((a, b) =>
    new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  )

  const equityCurve = sortedDailyPnL.map(day => {
    cumulative += day.pnl
    if (cumulative > peak) peak = cumulative
    const drawdown = peak - cumulative
    if (drawdown > maxDrawdown) maxDrawdown = drawdown

    return {
      date: day.dateStr,
      entry_date: day.entry_date,
      pnl: cumulative,
      rawPnl: day.pnl
    }
  })

  // Market Performance
  const marketPerformance = {
    spot: { trades: 0, profit_loss: 0, win_rate: 0 },
    futures: { trades: 0, profit_loss: 0, win_rate: 0 },
    margin: { trades: 0, profit_loss: 0, win_rate: 0 }
  }
  const marketTypes: Market[] = ['spot', 'futures', 'margin']
  marketTypes.forEach(m => {
    const mt = closedTrades.filter(t => t.market === m)
    const mw = mt.filter(t => (t.profit_loss || 0) > 0)
    const mpl = mt.reduce((sum, t) => sum + (t.profit_loss || 0), 0)
    marketPerformance[m] = {
      trades: mt.length,
      profit_loss: mpl,
      win_rate: mt.length > 0 ? (mw.length / mt.length) * 100 : 0
    }
  })

  // Dominant Emotions
  const getDominantEmotion = (type: 'entry' | 'exit') => {
    const counts = trades.reduce((acc, t) => {
      const e = type === 'entry' ? t.entry_emotion : t.exit_emotion
      if (e) acc[e] = (acc[e] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    if (Object.keys(counts).length === 0) return { emotion: '-', count: 0 }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return { emotion: sorted[0][0], count: sorted[0][1] }
  }

  // Monthly Pnl
  const monthlyPnLMap = closedTrades.reduce((acc, trade) => {
    const mo = format(new Date(trade.entry_date), 'MMM')
    if (!acc[mo]) acc[mo] = 0
    acc[mo] += trade.profit_loss || 0
    return acc
  }, {} as Record<string, number>)

  const monthlyPnL = Object.entries(monthlyPnLMap).map(([name, value]) => ({
    name,
    value,
    status: value >= 0 ? 'profit' : 'loss'
  })) as { name: string, value: number, status: 'profit' | 'loss' }[]


  return {
    total_trades: trades.length,
    closed_trades: closedTrades.length,
    open_trades: openTradesCount,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    total_profit_loss: totalProfitLoss,
    total_profit: totalProfit,
    total_loss: totalLoss,
    average_win: averageWin,
    average_loss: averageLoss,
    profit_factor: profitFactor,
    max_drawdown: maxDrawdown,
    expectancy,
    largest_win: largestWin,
    largest_loss: largestLoss,
    current_streak: currentStreak,
    max_win_streak: maxWinStreak,
    max_loss_streak: maxLossStreak,
    avg_hold_time_win: avgHoldTimeWin,
    avg_hold_time_loss: avgHoldTimeLoss,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    dominant_emotions: {
      entry: getDominantEmotion('entry'),
      exit: getDominantEmotion('exit')
    },
    market_performance: marketPerformance,
    monthly_pnl: monthlyPnL,
    equity_curve: equityCurve,
    open_trades_list: trades.filter(t => t.status === 'open').map(t => ({
      id: t.id,
      symbol: t.symbol,
      market: t.market,
      direction: t.direction,
      entry_price: t.entry_price,
      capital_amount: t.capital_amount,
      entry_date: t.entry_date,
      leverage: t.leverage
    }))
  }
}

export async function getUniqueSymbols() {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('trades_simple')
    .select('symbol')
    .eq('user_id', user.id)
    .not('symbol', 'is', null)

  if (error) throw error
  return [...new Set(data.map(item => item.symbol))]
}

export async function getUniqueTimeframes() {
  const { user, supabase } = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('trades_simple')
    .select('timeframe')
    .eq('user_id', user.id)
    .not('timeframe', 'is', null)

  if (error) throw error
  return [...new Set(data.map(item => item.timeframe).filter(Boolean))]
}
