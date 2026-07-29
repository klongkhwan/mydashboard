const heatmapWidgets = {
  stock: {
    script: 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
    sourceUrl: 'https://www.tradingview.com/heatmap/stock/',
    label: 'Stock Heatmap',
    config: {
      dataSource: 'SPX500',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      grouping: 'sector',
    },
  },
  crypto: {
    script: 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js',
    sourceUrl: 'https://www.tradingview.com/heatmap/crypto/',
    label: 'Crypto Heatmap',
    config: {
      dataSource: 'Crypto',
      blockSize: 'market_cap_calc',
      blockColor: '24h_close_change|5',
      isZoomEnabled: true,
    },
  },
}

module.exports = { heatmapWidgets }
