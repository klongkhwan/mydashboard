import { describe, it } from 'node:test'
import assert from 'node:assert'
import { calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI } from '../lib/indicators.ts'

describe('Indicators calculation', () => {
  const dummyCandles = [
    { time: 1, open: 10, high: 12, low: 9, close: 10 },
    { time: 2, open: 10, high: 13, low: 10, close: 12 },
    { time: 3, open: 12, high: 15, low: 11, close: 14 },
    { time: 4, open: 14, high: 16, low: 13, close: 13 },
    { time: 5, open: 13, high: 17, low: 12, close: 16 },
  ]

  it('handles empty or short input gracefully', () => {
    assert.deepStrictEqual(calculateSMA([], 3), [])
    assert.deepStrictEqual(calculateEMA([], 3), [])
    assert.deepStrictEqual(calculateBollingerBands([], 3), { upper: [], middle: [], lower: [] })
    assert.deepStrictEqual(calculateRSI([], 3), [])

    assert.deepStrictEqual(calculateSMA(dummyCandles.slice(0, 2), 3), [])
  })

  it('calculates SMA correctly', () => {
    // period 3: (10 + 12 + 14) / 3 = 12
    const sma = calculateSMA(dummyCandles, 3)
    assert.strictEqual(sma.length, 3)
    assert.strictEqual(sma[0].value, 12)
    assert.strictEqual(sma[0].time, 3)
    // next: (12 + 14 + 13) / 3 = 13
    assert.strictEqual(sma[1].value, 13)
  })

  it('calculates EMA correctly', () => {
    const ema = calculateEMA(dummyCandles, 3)
    assert.strictEqual(ema.length, 3)
    // First point is SMA = 12
    assert.strictEqual(ema[0].value, 12)
    // Next: k = 2 / 4 = 0.5. 13 * 0.5 + 12 * 0.5 = 12.5
    assert.strictEqual(ema[1].value, 12.5)
  })

  it('calculates Bollinger Bands correctly', () => {
    const bb = calculateBollingerBands(dummyCandles, 3, 2)
    assert.strictEqual(bb.middle.length, 3)
    assert.strictEqual(bb.upper.length, 3)
    assert.strictEqual(bb.lower.length, 3)
    assert.ok(bb.upper[0].value >= bb.middle[0].value)
    assert.ok(bb.middle[0].value >= bb.lower[0].value)
  })

  it('calculates RSI values between 0 and 100', () => {
    const extendedCandles = [
      ...dummyCandles,
      { time: 6, open: 16, high: 18, low: 15, close: 17 },
      { time: 7, open: 17, high: 19, low: 16, close: 18 },
      { time: 8, open: 18, high: 20, low: 17, close: 19 },
      { time: 9, open: 19, high: 21, low: 18, close: 20 },
      { time: 10, open: 20, high: 22, low: 19, close: 21 },
      { time: 11, open: 21, high: 23, low: 20, close: 22 },
      { time: 12, open: 22, high: 24, low: 21, close: 23 },
      { time: 13, open: 23, high: 25, low: 22, close: 24 },
      { time: 14, open: 24, high: 26, low: 23, close: 25 },
      { time: 15, open: 25, high: 27, low: 24, close: 26 },
      { time: 16, open: 26, high: 28, low: 25, close: 27 },
    ]
    const rsi = calculateRSI(extendedCandles, 5)
    assert.ok(rsi.length > 0)
    for (const pt of rsi) {
      assert.ok(pt.value >= 0 && pt.value <= 100)
    }
  })
})
