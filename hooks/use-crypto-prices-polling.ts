'use client'

import { useEffect, useState, useRef } from 'react'

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
let globalSocket: WebSocket | null = null
let activeSymbols: Set<string> = new Set()
let connectionAttempts = 0
let reconnectTimeout: NodeJS.Timeout | null = null
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

        console.log('CryptoPricesWebSocket: Loaded symbols from localStorage:', symbols)
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

const connectWebSocket = () => {
  if (globalSocket?.readyState === WebSocket.OPEN || globalSocket?.readyState === WebSocket.CONNECTING) {
    return
  }

  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  try {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws')
    globalSocket = ws

    ws.onopen = () => {
      console.log('CryptoPricesWebSocket: Connected')
      connectionAttempts = 0 // Reset attempts on success
      subscribeToSymbols(Array.from(activeSymbols))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle ticker update
        if (data.e === '24hrTicker') {
          const symbol = data.s
          const newPrice: CryptoPrice = {
            symbol: symbol,
            price: parseFloat(data.c),
            priceChange: parseFloat(data.p),
            priceChangePercent: parseFloat(data.P)
          }

          globalPrices[symbol] = newPrice
          notifyListeners()
        }
      } catch (error) {
        // Ignore parse errors or non-ticker messages
      }
    }

    ws.onerror = (error) => {
      console.error('CryptoPricesWebSocket: Error', error)
    }

    ws.onclose = () => {
      console.log('CryptoPricesWebSocket: Closed')
      globalSocket = null

      // Reconnect logic with exponential backoff
      const timeout = Math.min(1000 * Math.pow(2, connectionAttempts), 30000)
      connectionAttempts++
      console.log(`CryptoPricesWebSocket: Reconnecting in ${timeout}ms...`)

      reconnectTimeout = setTimeout(() => {
        connectWebSocket()
      }, timeout)
    }

  } catch (error) {
    console.error('CryptoPricesWebSocket: Failed to connect', error)
  }
}

const subscribeToSymbols = (symbols: string[]) => {
  if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) return
  if (symbols.length === 0) return

  const params = symbols.map(s => `${s.toLowerCase()}usdt@ticker`)

  const msg = {
    method: 'SUBSCRIBE',
    params: params,
    id: Date.now()
  }

  globalSocket.send(JSON.stringify(msg))
}

const unsubscribeFromSymbols = (symbols: string[]) => {
  if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) return
  if (symbols.length === 0) return

  const params = symbols.map(s => `${s.toLowerCase()}usdt@ticker`)

  const msg = {
    method: 'UNSUBSCRIBE',
    params: params,
    id: Date.now()
  }

  globalSocket.send(JSON.stringify(msg))
}

const notifyListeners = () => {
  globalListeners.forEach(listener => listener())
}

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
        console.log('CryptoPricesWebSocket: Symbols changed, updating:', newSymbols)
      }
    }

    // Check immediately
    checkSymbolChanges()

    // Check periodically for changes (every 3 seconds) - kept for settings sync
    const interval = setInterval(checkSymbolChanges, 3000)

    // Listen for custom settings change event
    const handleSettingsChange = () => {
      console.log('CryptoPricesWebSocket: Settings change event received')
      checkSymbolChanges()
    }

    window.addEventListener('settings-changed', handleSettingsChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('settings-changed', handleSettingsChange)
    }
  }, [symbols])

  // Manage WebSocket subscription
  useEffect(() => {
    if (symbols.length === 0) return

    // Update active symbols ref
    const newSymbols = new Set(symbols)

    // Calculate diffs if socket is open to optimize calls
    // But for simplicity, we can just resubscribe if needed or manage global set
    // Let's rely on global set management

    symbols.forEach(s => activeSymbols.add(s))

    // Connect if not connected
    if (!globalSocket) {
      connectWebSocket()
    } else if (globalSocket.readyState === WebSocket.OPEN) {
      // If already connected, ensure we are subscribed to current symbols
      // It's safe to resubscribe to existing ones, Binance handles it
      subscribeToSymbols(symbols)
    }

    const updateListener = () => {
      setPrices({ ...globalPrices })
      setIsLoading(false)
    }

    globalListeners.push(updateListener)

    // Set initial prices if available
    if (Object.keys(globalPrices).length > 0) {
      setPrices({ ...globalPrices })
      setIsLoading(false)
    }

    return () => {
      // Remove listener
      const index = globalListeners.indexOf(updateListener)
      if (index > -1) {
        globalListeners.splice(index, 1)
      }

      // We don't unsubscribe here because other components might need the data
      // and we don't have reference counting. 
      // Ideally we would ref count, but for this app keeping connection open is fine.
    }
  }, [symbols])

  return { prices, isLoading }
}