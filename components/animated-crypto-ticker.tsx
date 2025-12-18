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
      className={`text-[13px] font-mono font-semibold transition-all duration-300 ${direction === 'up' ? 'text-green-400' :
        direction === 'down' ? 'text-red-400' :
          'text-white'
        } ${isAnimating ? 'scale-105' : 'scale-100'}`}
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
    <div className="relative w-full h-12 bg-black overflow-hidden border-b border-gray-800/50">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-black opacity-80" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px'
        }}
      />

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
              className="flex items-center gap-2 mx-4 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-gray-800/30 hover:bg-gray-900/60 transition-all duration-300 hover:scale-105 hover:border-gray-700/50"
            >
              {/* Crypto icon/symbol with accent */}
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                  {shortSymbol}
                </span>
                <div className={`w-0.5 h-0.5 rounded-full ${(priceData?.priceChangePercent ?? 0) >= 0
                  ? 'bg-green-400'
                  : 'bg-red-400'
                  }`} />
              </div>

              {priceData && !isNaN(priceData.price) ? (
                <>
                  <PriceDisplay
                    symbol={symbol}
                    price={priceData.price}
                  />

                  {(priceData.priceChangePercent ?? 0) !== 0 && (
                    <div className="flex items-center gap-0.5">
                      <span
                        className={`text-[10px] px-1 py-0.5 rounded-full font-medium ${(priceData.priceChangePercent ?? 0) >= 0
                          ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                          : 'bg-red-500/20 text-red-300 border border-red-500/20'
                          }`}
                      >
                        {(priceData.priceChangePercent ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(priceData.priceChangePercent ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-gray-500 font-mono">
                  {isLoading ? '⋯' : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Smooth gradient overlays for edges */}
      <div className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
      <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-black via-black/80 to-transparent z-10" />

      {/* Top and bottom accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent" />
    </div>
  )
}