'use client'

import { useCryptoPricesPolling } from '@/hooks/use-crypto-prices-polling'
import { useAnimatedPrice } from '@/hooks/use-animated-price'
import { useSettings } from '@/hooks/use-settings'
import { useEffect, useState, useRef } from 'react'

interface CryptoPriceItem {
  symbol: string
  price: number
  previousPrice: number
  priceChange: number
  priceChangePercent: number
}

function formatCryptoPrice(symbol: string, price: number): string {
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } else if (symbol.includes('DOGE') || symbol.includes('ADA') || symbol.includes('XRP')) {
    return `$${price.toFixed(6)}`
  } else {
    return `$${price.toFixed(4)}`
  }
}

function getShortSymbol(symbol: string): string {
  return symbol.replace('USDT', '')
}

function PriceDisplay({ symbol, price }: { symbol: string; price: number }) {
  const { displayValue, isAnimating } = useAnimatedPrice({ value: price, duration: 1000 })
  const [direction, setDirection] = useState<'up' | 'down' | 'neutral'>('neutral')
  const prevPriceRef = useRef(price)

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setDirection('up')
    } else if (price < prevPriceRef.current) {
      setDirection('down')
    }
    prevPriceRef.current = price
  }, [price])

  return (
    <span
      className={`text-[12px] font-bold tracking-tight transition-colors duration-500 tabular-nums ${direction === 'up' ? 'text-primary' :
        direction === 'down' ? 'text-destructive' :
          'text-foreground'
        }`}
    >
      {formatCryptoPrice(symbol, displayValue)}
    </span>
  )
}

export function AnimatedCryptoTicker() {
  const { prices, isLoading } = useCryptoPricesPolling()
  const { settings, isLoading: settingsLoading, getTitleBarCoin } = useSettings()
  const lastTitleRef = useRef('')

  // Update title bar based on settings
  useEffect(() => {
    if (settingsLoading) return

    const titleBarCoin = getTitleBarCoin()
    if (titleBarCoin && titleBarCoin.price > 0) {
      const titleText = `$${titleBarCoin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const newTitle = `${titleText} | Superlboard`

      if (lastTitleRef.current !== newTitle) {
        document.title = newTitle
        lastTitleRef.current = newTitle
      }
    } else {
      const btcPrice = prices['BTCUSDT']
      if (btcPrice && !isNaN(btcPrice.price)) {
        const titleText = `$${btcPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const newTitle = `${titleText} | Superlboard`

        if (lastTitleRef.current !== newTitle) {
          document.title = newTitle
          lastTitleRef.current = newTitle
        }
      } else if (lastTitleRef.current !== 'Superlboard') {
        document.title = 'Superlboard'
        lastTitleRef.current = 'Superlboard'
      }
    }
  }, [prices, settings, settingsLoading, getTitleBarCoin])

  // Get symbols from localStorage settings, fallback to BTCUSDT only
  const getTickerSymbols = () => {
    if (settingsLoading) return ['BTCUSDT']

    // Use new coinDisplays format
    if (settings.coinDisplays && settings.coinDisplays.length > 0) {
      const selectedCoins = settings.coinDisplays
        .filter(coinDisplay => coinDisplay.show)
        .map(coinDisplay => `${coinDisplay.symbol}USDT`)

      if (selectedCoins.length > 0) {
        return selectedCoins
      }
    }

    // Default to BTCUSDT if no settings
    return ['BTCUSDT']
  }

  const symbols = getTickerSymbols()
  // Create 6 copies for seamless scrolling on any screen size
  const allSymbols = [...symbols, ...symbols, ...symbols, ...symbols, ...symbols, ...symbols]

  // Pure CSS animation doesn't need setInterval anymore

  return (
    <div className="relative w-full h-10 bg-background overflow-hidden border-b border-white/5">
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-black/20" />

      <div
        className="whitespace-nowrap flex items-center h-full animate-ticker-scroll"
        style={{
          width: 'max-content'
        }}
      >
        {allSymbols.map((symbol, index) => {
          const priceData = prices[symbol]
          const shortSymbol = getShortSymbol(symbol)

          return (
            <div
              key={`${symbol}-${index}`}
              className="flex items-center gap-3 mx-6 shrink-0"
            >
              {/* Crypto symbol */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                  {shortSymbol}
                </span>
                <div className={`w-1 h-1 rounded-full ${(priceData?.priceChangePercent ?? 0) >= 0
                  ? 'bg-primary'
                  : 'bg-destructive'
                  }`} />
              </div>

              {priceData && !isNaN(priceData.price) ? (
                <>
                  <PriceDisplay
                    symbol={symbol}
                    price={priceData.price}
                  />

                  {(priceData.priceChangePercent ?? 0) !== 0 && (
                    <span
                      className={`text-[11px] font-bold ${(priceData.priceChangePercent ?? 0) >= 0
                        ? 'text-primary'
                        : 'text-destructive'
                        }`}
                    >
                      {(priceData.priceChangePercent ?? 0) >= 0 ? '+' : ''}{priceData.priceChangePercent.toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isLoading ? '...' : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Smooth gradient overlays for edges */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-background to-transparent z-10" />
    </div>
  )
}