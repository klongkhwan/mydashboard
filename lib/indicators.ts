export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface LineDataPoint {
  time: number
  value: number
}

export interface BollingerBandsResult {
  upper: LineDataPoint[]
  middle: LineDataPoint[]
  lower: LineDataPoint[]
}

/**
 * Calculates Simple Moving Average (SMA).
 */
export function calculateSMA(data: CandleData[], period: number): LineDataPoint[] {
  if (!data || data.length < period || period <= 0) return []
  const result: LineDataPoint[] = []

  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].close
  }
  result.push({ time: data[period - 1].time, value: sum / period })

  for (let i = period; i < data.length; i++) {
    sum += data[i].close - data[i - period].close
    result.push({ time: data[i].time, value: sum / period })
  }
  return result
}

/**
 * Calculates Exponential Moving Average (EMA).
 */
export function calculateEMA(data: CandleData[], period: number): LineDataPoint[] {
  if (!data || data.length < period || period <= 0) return []
  const result: LineDataPoint[] = []
  const k = 2 / (period + 1)

  // Seed EMA with initial SMA
  let initialSum = 0
  for (let i = 0; i < period; i++) {
    initialSum += data[i].close
  }
  let prevEma = initialSum / period
  result.push({ time: data[period - 1].time, value: prevEma })

  for (let i = period; i < data.length; i++) {
    const currentEma = data[i].close * k + prevEma * (1 - k)
    result.push({ time: data[i].time, value: currentEma })
    prevEma = currentEma
  }
  return result
}

/**
 * Calculates Bollinger Bands (Upper, Middle/SMA, Lower).
 */
export function calculateBollingerBands(
  data: CandleData[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsResult {
  if (!data || data.length < period || period <= 0) {
    return { upper: [], middle: [], lower: [] }
  }

  const upper: LineDataPoint[] = []
  const middle: LineDataPoint[] = []
  const lower: LineDataPoint[] = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    const mean = sum / period

    let varianceSum = 0
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(data[i - j].close - mean, 2)
    }
    const stdDev = Math.sqrt(varianceSum / period)

    const time = data[i].time
    middle.push({ time, value: mean })
    upper.push({ time, value: mean + stdDevMultiplier * stdDev })
    lower.push({ time, value: mean - stdDevMultiplier * stdDev })
  }

  return { upper, middle, lower }
}

/**
 * Calculates Relative Strength Index (RSI - Wilder's Smoothing).
 */
export function calculateRSI(data: CandleData[], period = 14): LineDataPoint[] {
  if (!data || data.length <= period || period <= 0) return []
  const result: LineDataPoint[] = []

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  let rsi = 100 - 100 / (1 + rs)
  result.push({ time: data[period].time, value: rsi })

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0

    // Wilder's smoothing
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi = 100 - 100 / (1 + rs)
    result.push({ time: data[i].time, value: rsi })
  }

  return result
}
