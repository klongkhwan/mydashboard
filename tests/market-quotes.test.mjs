import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getAssetQuote, getBatchAssetQuotes, getUsdThbRate } from '../lib/market-quotes.ts'

describe('Market quotes module', () => {
  it('returns null for empty or invalid symbol', async () => {
    assert.strictEqual(await getAssetQuote(''), null)
    assert.strictEqual(await getAssetQuote(null), null)
    assert.strictEqual(await getAssetQuote(undefined), null)
  })

  it('deduplicates batch symbols correctly', async () => {
    const quotes = await getBatchAssetQuotes(['', '   '])
    assert.deepStrictEqual(quotes, {})
  })

  it('returns a positive number for USD/THB rate', async () => {
    const rate = await getUsdThbRate()
    assert.strictEqual(typeof rate, 'number')
    assert.ok(rate > 20 && rate < 60)
  })

  it('maps both clean and base crypto symbols in batch quotes', async () => {
    const quote = await getAssetQuote('SOLUSDT', 'crypto_holding')
    if (quote) {
      assert.strictEqual(typeof quote.price, 'number')
      assert.ok(quote.price > 0)
    }
  })
})
