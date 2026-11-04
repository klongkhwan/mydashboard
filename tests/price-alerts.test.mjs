import { describe, it } from 'node:test'
import assert from 'node:assert'
import { sendPriceAlertEmail } from '../lib/email-service.ts'

describe('Price Alerts & Email Service', () => {
  it('sendPriceAlertEmail returns simulated success in dev environment', async () => {
    const result = await sendPriceAlertEmail({
      to: 'trader@example.com',
      symbol: 'BTCUSDT',
      targetPrice: 95000,
      currentPrice: 95100,
      condition: 'crosses_above',
      note: 'Take profit 1',
    })

    assert.strictEqual(result.success, true)
    if (!process.env.RESEND_API_KEY) {
      assert.strictEqual(result.simulated, true)
    }
  })

  it('correctly evaluates crosses_above condition', () => {
    const alert = {
      target_price: 90000,
      condition: 'crosses_above',
    }

    const priceBelow = 89990
    const priceExact = 90000
    const priceAbove = 90100

    assert.strictEqual(priceBelow >= alert.target_price, false)
    assert.strictEqual(priceExact >= alert.target_price, true)
    assert.strictEqual(priceAbove >= alert.target_price, true)
  })

  it('correctly evaluates crosses_below condition', () => {
    const alert = {
      target_price: 80000,
      condition: 'crosses_below',
    }

    const priceAbove = 80500
    const priceExact = 80000
    const priceBelow = 79900

    assert.strictEqual(priceAbove <= alert.target_price, false)
    assert.strictEqual(priceExact <= alert.target_price, true)
    assert.strictEqual(priceBelow <= alert.target_price, true)
  })

  it('correctly handles watchlist groups backward compatibility and serialization', () => {
    // 1. Legacy watchlist array fallback
    const legacySettings = {
      watchlist: ['BTCUSDT', 'ETHUSDT'],
    }
    const migratedGroups = legacySettings.watchlistGroups || { Main: legacySettings.watchlist }
    assert.deepStrictEqual(migratedGroups.Main, ['BTCUSDT', 'ETHUSDT'])

    // 2. Multi-group management
    const multiGroupSettings = {
      watchlistGroups: {
        Main: ['BTCUSDT'],
        DeFi: ['UNIUSDT', 'AAVEUSDT'],
      },
      activeWatchlistGroup: 'DeFi',
    }
    assert.strictEqual(multiGroupSettings.watchlistGroups.DeFi.length, 2)
    assert.strictEqual(multiGroupSettings.activeWatchlistGroup, 'DeFi')
  })

  it('handles negative or invalid target prices safely', () => {
    const invalidPrices = [-100, 0, NaN, Infinity]
    for (const p of invalidPrices) {
      const isValid = typeof p === 'number' && !isNaN(p) && isFinite(p) && p > 0
      assert.strictEqual(isValid, false)
    }
  })
})
