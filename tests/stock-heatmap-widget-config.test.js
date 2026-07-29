const test = require('node:test')
const assert = require('node:assert/strict')
const { heatmapWidgets } = require('../lib/stock-heatmap-widget-config.js')

test('provides a stock heatmap configured for the S&P 500', () => {
  assert.deepEqual(heatmapWidgets.stock, {
    script: 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
    sourceUrl: 'https://www.tradingview.com/heatmap/stock/',
    label: 'Stock Heatmap',
    config: {
      dataSource: 'SPX500',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      grouping: 'sector',
    },
  })
})

test('provides a crypto heatmap configured by 24-hour change', () => {
  assert.equal(heatmapWidgets.crypto.config.dataSource, 'Crypto')
  assert.equal(heatmapWidgets.crypto.config.blockSize, 'market_cap_calc')
  assert.equal(heatmapWidgets.crypto.config.blockColor, '24h_close_change|5')
  assert.equal(heatmapWidgets.crypto.config.isZoomEnabled, true)
})
