import { NextResponse } from 'next/server'

export const runtime = "edge"

export async function GET() {
  try {
    // Fetch multiple crypto prices from Binance API
    const symbols = ['BTCUSDT', 'ETHUSDT', 'DOGEUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'AVAXUSDT']
    const prices = []

    // Use Promise.all for parallel fetching
    const promises = symbols.map(async (symbol) => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          return {
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            priceChange: parseFloat(data.priceChange),
            priceChangePercent: parseFloat(data.priceChangePercent)
          }
        }
        return null
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error)
        return null
      }
    })

    const results = await Promise.all(promises)
    const validPrices = results.filter(price => price !== null)

    return NextResponse.json(validPrices)
  } catch (error) {
    console.error('Error fetching crypto prices:', error)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}