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

export function useCryptoPricesPolling() {
  const [prices, setPrices] = useState<CryptoPrices>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/crypto-prices')
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
  }, [])

  return { prices, isLoading }
}