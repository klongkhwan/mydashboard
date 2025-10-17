'use client'

import { useState, useEffect } from 'react'
import { useCryptoPricesPolling } from '@/hooks/use-crypto-prices-polling'

interface CoinDisplay {
  symbol: string
  show: boolean
  isTitle: boolean
}

interface Settings {
  coinDisplays: CoinDisplay[]
}

const defaultSettings: Settings = {
  coinDisplays: [
    { symbol: 'BTC', show: true, isTitle: true },
    { symbol: 'ETH', show: true, isTitle: false },
    { symbol: 'BNB', show: false, isTitle: false }
  ]
}

export function useSettings() {
  // Try to load from localStorage immediately for client-side
  const getInitialSettings = (): Settings => {
    // Default to defaultSettings during SSR
    if (typeof window === 'undefined') {
      return defaultSettings
    }

    try {
      const savedSettings = localStorage.getItem('superlboard-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)

        // Migrate old settings to new format
        let updatedSettings = { ...defaultSettings, ...parsed }

        // If old format (dashboardCoins only), convert to new format
        if (!parsed.coinDisplays && parsed.dashboardCoins) {
          updatedSettings.coinDisplays = parsed.dashboardCoins.map((symbol: string, index: number) => ({
            symbol,
            show: true,
            isTitle: index === 0 // First coin as title by default
          }))
        }

        console.log('Loaded settings from localStorage:', updatedSettings)
        return updatedSettings
      }
    } catch (error) {
      console.error('Error loading initial settings:', error)
    }
    return defaultSettings
  }

  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { prices, isLoading: pricesLoading } = useCryptoPricesPolling()

  // Load localStorage data immediately after mount
  useEffect(() => {
    setMounted(true)
    const loadedSettings = getInitialSettings()
    setSettings(loadedSettings)
    setIsLoading(false)
    console.log('Settings loaded on mount:', loadedSettings)
  }, [])

  // บันทึก settings ไป localStorage
  const updateSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    try {
      localStorage.setItem('superlboard-settings', JSON.stringify(updatedSettings))
      console.log('Settings saved:', updatedSettings)

      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('settings-changed', { detail: updatedSettings }))
    } catch (error) {
      console.error('Error saving settings:', error)
    }

    return updatedSettings
  }

  // ดึงข้อมูลราคาจาก crypto-prices
  const getCoinPrice = (symbol: string) => {
    const symbolUSDT = `${symbol}USDT`
    const priceData = prices[symbolUSDT]

    if (priceData && !isNaN(priceData.price)) {
      return {
        price: priceData.price,
        change: priceData.priceChangePercent || 0,
        priceChange: priceData.priceChange || 0
      }
    }

    return null
  }

  // อัพเดต title bar ตาม settings (price format only)
  const updateTitleBar = (currentSettings?: Settings) => {
    const current = currentSettings || settings

    // Find the title coin from coinDisplays
    const titleCoinDisplay = current.coinDisplays.find(coin => coin.isTitle && coin.show)
    const titleCoin = titleCoinDisplay?.symbol || 'BTC'

    const coinPrice = getCoinPrice(titleCoin)
    if (coinPrice) {
      // Always use price format only
      const titleText = `$${coinPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      document.title = `${titleText} | Superlboard`
    } else {
      document.title = 'Superlboard'
    }
  }

  // อัพเดต title bar ทุกครั้งที่ settings หรือ prices เปลี่ยน
  useEffect(() => {
    if (!isLoading && !pricesLoading) {
      updateTitleBar()
    }
  }, [settings, isLoading, pricesLoading, prices])

  // ดึงข้อมูลเหรียญที่แสดง (show = true)
  const getSelectedCoins = () => {
    return settings.coinDisplays
      .filter(coinDisplay => coinDisplay.show)
      .map(coinDisplay => {
        const coinPrice = getCoinPrice(coinDisplay.symbol)
        return {
          symbol: coinDisplay.symbol,
          isTitle: coinDisplay.isTitle,
          price: coinPrice?.price || 0,
          change: coinPrice?.change || 0,
          priceChange: coinPrice?.priceChange || 0
        }
      })
  }

  // ดึงข้อมูลเหรียญสำหรับ title bar
  const getTitleBarCoin = () => {
    const titleCoinDisplay = settings.coinDisplays.find(coin => coin.isTitle && coin.show)
    const titleCoin = titleCoinDisplay?.symbol || 'BTC'

    const coinPrice = getCoinPrice(titleCoin)
    return {
      symbol: titleCoin,
      price: coinPrice?.price || 0,
      change: coinPrice?.change || 0,
      priceChange: coinPrice?.priceChange || 0
    }
  }

  // ฟังก์ชันสำหรับจัดการ coin displays
  const updateCoinDisplay = (symbol: string, field: 'show' | 'isTitle', value: boolean) => {
    let coinExists = false

    let updatedCoinDisplays = settings.coinDisplays.map(coin => {
      if (coin.symbol === symbol) {
        coinExists = true
        if (field === 'isTitle' && value) {
          // If setting as title, unset all other titles
          return { ...coin, [field]: value, show: true }
        } else if (field === 'show' && !value) {
          // If hiding, also remove title
          return { ...coin, show: false, isTitle: false }
        } else if (field === 'isTitle' && !value) {
          return { ...coin, [field]: value }
        } else {
          return { ...coin, [field]: value }
        }
      }
      // If setting a new title, remove title from all other coins
      if (field === 'isTitle' && value && coin.symbol !== symbol) {
        return { ...coin, isTitle: false }
      }
      return coin
    })

    // If coin doesn't exist, add it
    if (!coinExists) {
      const newCoin: CoinDisplay = {
        symbol,
        show: field === 'show' ? value : true,
        isTitle: field === 'isTitle' ? value : false
      }

      // If setting as title, remove title from all existing coins
      if (field === 'isTitle' && value) {
        updatedCoinDisplays = updatedCoinDisplays.map(coin => ({
          ...coin,
          isTitle: false
        }))
      }

      updatedCoinDisplays.push(newCoin)
    }

    updateSettings({ coinDisplays: updatedCoinDisplays })
  }

  // ดึงข้อมูล dashboard coins จาก coinDisplays (สำหรับ crypto prices API)
  const getDashboardCoins = () => {
    return settings.coinDisplays
      .filter(coinDisplay => coinDisplay.show)
      .map(coinDisplay => coinDisplay.symbol)
  }

  return {
    settings,
    isLoading: !mounted || isLoading || pricesLoading,
    updateSettings,
    updateTitleBar,
    getSelectedCoins,
    getTitleBarCoin,
    getCoinPrice,
    updateCoinDisplay,
    getDashboardCoins
  }
}