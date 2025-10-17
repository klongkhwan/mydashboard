'use client'

import { useEffect, useState } from 'react'

interface CryptoPrice {
  symbol: string
  price: number
  priceChange: number
  priceChangePercent: number
}

interface CryptoPrices {
  [key: string]: CryptoPrice | null
}

// Global state to share data between components
let globalPrices: CryptoPrices = {}
let globalListeners: (() => void)[] = []
let globalIntervalId: NodeJS.Timeout | null = null
let isInitialized = false

// Initialize immediately when module loads
const initializeSymbols = () => {
  if (isInitialized || typeof window === 'undefined') return ['BTC', 'ETH', 'BNB']

  try {
    const savedSettings = localStorage.getItem('superlboard-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)

      // Check for new format (coinDisplays)
      if (parsed.coinDisplays && parsed.coinDisplays.length > 0) {
        const symbols = parsed.coinDisplays
          .filter((coin: any) => coin.show)
          .map((coin: any) => coin.symbol)

        console.log('CryptoPricesPolling: Loaded symbols from localStorage:', symbols)
        return symbols
      }

      // Check for old format (dashboardCoins) - for migration
      if (parsed.dashboardCoins && parsed.dashboardCoins.length > 0) {
        return parsed.dashboardCoins
      }
    }
  } catch (error) {
    console.error('Error loading initial symbols:', error)
  }

  return ['BTC', 'ETH', 'BNB']
}

// Store initial symbols globally
const initialSymbols = initializeSymbols()
isInitialized = true

export function useCryptoPricesPolling() {
  const [prices, setPrices] = useState<CryptoPrices>({})
  const [isLoading, setIsLoading] = useState(true)
  const [symbols, setSymbols] = useState<string[]>(initialSymbols)

  // Get symbols from localStorage or use defaults
  const getSymbols = () => {
    if (typeof window === 'undefined') return initialSymbols

    try {
      const savedSettings = localStorage.getItem('superlboard-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)

        // Check for new format (coinDisplays)
        if (parsed.coinDisplays && parsed.coinDisplays.length > 0) {
          return parsed.coinDisplays
            .filter((coin: any) => coin.show)
            .map((coin: any) => coin.symbol)
        }

        // Check for old format (dashboardCoins) - for migration
        if (parsed.dashboardCoins && parsed.dashboardCoins.length > 0) {
          return parsed.dashboardCoins
        }
      }
    } catch (error) {
      console.error('Error loading settings for symbols:', error)
    }

    return initialSymbols
  }

  // Check for symbol changes
  useEffect(() => {
    const checkSymbolChanges = () => {
      const newSymbols = getSymbols()
      const symbolsChanged = JSON.stringify(newSymbols.sort()) !== JSON.stringify(symbols.sort())

      if (symbolsChanged) {
        setSymbols(newSymbols)
        console.log('CryptoPricesPolling: Symbols changed, updating:', newSymbols)
      }
    }

    // Check immediately
    checkSymbolChanges()

    // Check periodically for changes (every 3 seconds)
    const interval = setInterval(checkSymbolChanges, 3000)

    // Listen for custom settings change event
    const handleSettingsChange = () => {
      console.log('CryptoPricesPolling: Settings change event received')
      checkSymbolChanges()
    }

    window.addEventListener('settings-changed', handleSettingsChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('settings-changed', handleSettingsChange)
    }
  }, [symbols])

  // Fetch prices function
  const fetchPrices = async () => {
    try {
      const symbolsParam = symbols.join(',')
      console.log('CryptoPricesPolling: Fetching prices for symbols:', symbols)
      const response = await fetch(`/api/crypto-prices?symbols=${encodeURIComponent(symbolsParam)}`)
      if (response.ok) {
        const data = await response.json()
        const newPrices: CryptoPrices = {}

        data.forEach((item: CryptoPrice) => {
          newPrices[item.symbol] = item
        })

        // Update global state
        globalPrices = newPrices

        // Notify all listeners
        globalListeners.forEach(listener => listener())

        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching prices:', error)
      setIsLoading(false)
    }
  }

  // Re-fetch when symbols change
  useEffect(() => {
    if (symbols.length === 0) return

    // Add listener for updates
    const updateListener = () => {
      setPrices({...globalPrices})
    }
    globalListeners.push(updateListener)

    // Set initial prices from global state
    if (Object.keys(globalPrices).length > 0) {
      setPrices({...globalPrices})
      setIsLoading(false)
    }

    // Start polling only if not already started
    if (globalListeners.length === 1 && !globalIntervalId) {
      // Clear cache and fetch immediately when symbols change
      console.log('CryptoPricesPolling: Starting fresh fetch for new symbols:', symbols)
      globalPrices = {} // Clear cache
      fetchPrices()
      globalIntervalId = setInterval(fetchPrices, 10000)
    }

    return () => {
      // Remove listener
      const index = globalListeners.indexOf(updateListener)
      if (index > -1) {
        globalListeners.splice(index, 1)
      }

      // Clean up interval if no more listeners
      if (globalListeners.length === 0 && globalIntervalId) {
        clearInterval(globalIntervalId)
        globalIntervalId = null
      }
    }
  }, [symbols])

  return { prices, isLoading }
}