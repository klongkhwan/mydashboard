import { useState, useEffect, useRef } from "react"
import { BinanceDataPoint, TradingDataPoint } from "@/types/crypto"

// Helper function to convert percentage strings to numbers
const convertPercentageToNumber = (value: any): number => {
  if (typeof value === 'string' && value.includes('%')) {
    return parseFloat(value.replace('%', ''))
  }
  if (typeof value === 'number') {
    return value
  }
  return 0
}

export const useBinanceData = (symbol: string, period: string) => {
  const [data, setData] = useState<TradingDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState(false)
  const isFetchingRef = useRef(false)



  const combineApiData = (
    openInterest: any,
    longShortAccount: any,
    longShortPosition: any,
    globalLongShort: any,
    takerRatio: any,
    basis: any,
  ): TradingDataPoint[] => {

    const num = (v: any) => convertPercentageToNumber(v ?? 0)

    // 1) กรณี API ส่ง array ตรง ๆ
    if (Array.isArray(longShortAccount?.data)) {
      return longShortAccount.data.map((item: any, index: number) => {
        const ts = item.timestamp || Date.now() - (30 - index) * 5 * 60000
        const thaiTime = new Date(ts).toLocaleTimeString('th-TH', {
          hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
        })

        // --- Accounts ---
        const accRatio =
          num(item.longShortAccounts ?? item.longShortRatio ?? item.long_short_ratio ?? item.ratio)

        let longAcc = num(item.longAccount ?? item.long_account ?? item.long)
        let shortAcc = num(item.shortAccount ?? item.short_account ?? item.short)

        if (!longAcc && !shortAcc && accRatio > 0) {
          shortAcc = 100 / (1 + accRatio)
          longAcc = 100 - shortAcc
        }

        // --- Positions (แยกจาก Accounts) ---
        const posRatio =
          num(item.longShortPositions ?? item.long_short_positions ?? item.positionsRatio ?? item.pos_ratio)

        let longPos = num(item.longPosition ?? item.long_pos)
        let shortPos = num(item.shortPosition ?? item.short_pos)

        if (!longPos && !shortPos && posRatio > 0) {
          shortPos = 100 / (1 + posRatio)
          longPos = 100 - shortPos
        }

        // --- Global (แยกจาก Accounts)---
        const globalRatio =
          num(item.longShortRatio ?? item.globalRatio ?? item.global_long_short_ratio)

        let globalLong = num(item.globalLongAccount ?? item.globalLong ?? item.global_long)
        let globalShort = num(item.globalShortAccount ?? item.globalShort ?? item.global_short)

        if (!globalLong && !globalShort && globalRatio > 0) {
          globalShort = 100 / (1 + globalRatio)
          globalLong = 100 - globalShort
        }

        // --- Taker ---
        const takerBuy  = num(item.takerBuy ?? item.buyVol ?? item.taker_buy)
        const takerSell = num(item.takerSell ?? item.sellVol ?? item.taker_sell)
        const takerBuySellRatio =
          num(item.takerBuySellRatio ?? item.buySellRatio) || (takerSell ? (takerBuy || 0) / takerSell : 0)

        // --- Prices & Basis ---
        const futuresPrice = num(item.futuresPrice ?? item.futures ?? item.markPrice)
        const priceIndex   = num(item.priceIndex ?? item.index ?? item.indexPrice)
        const basisVal     =
          (item.basis != null ? num(item.basis) : (futuresPrice && priceIndex ? futuresPrice - priceIndex : 0))

        return {
          time: thaiTime,
          timestamp: ts,

          // OI
          openInterest: num(item.openInterest),
          notionalValue: num(item.notionalValue),

          // Accounts
          longShortAccounts: accRatio || 0,
          longAccount: longAcc || 0,
          shortAccount: shortAcc || 0,

          // Positions
          longShortPositions: posRatio || 0,
          longPosition: longPos || 0,
          shortPosition: shortPos || 0,

          // Global
          longShortRatio: globalRatio || 0,
          globalLongAccount: globalLong || 0,
          globalShortAccount: globalShort || 0,

          // Taker
          takerBuy: takerBuy || 0,
          takerSell: takerSell || 0,
          takerBuySellRatio,

          // Prices & Basis
          futuresPrice: futuresPrice || 0,
          priceIndex: priceIndex || 0,
          basis: basisVal || 0,
        }
      })
    }

    // 2) โครงสร้าง { data: { xAxis, series[] } }
    const pickSeries = (series: any[], names: string[]) =>
      (series.find((s: any) => names.includes(String(s?.name)))?.data) ?? []

    // Open Interest
    const oiData = openInterest?.data ?? {}
    const xAxis: number[] = oiData.xAxis ?? []
    const oiSeries = oiData.series ?? []
    const openInterestValues   = pickSeries(oiSeries, ['sum_open_interest', 'open_interest', 'Open Interest'])
    const notionalValueValues  = pickSeries(oiSeries, ['sum_open_interest_value', 'open_interest_value', 'Notional Value'])

    // Accounts
    const lsaSeries = longShortAccount?.data?.series ?? []
    const longShortAccountValues = pickSeries(lsaSeries, ['Long/Short Ratio'])
    const longAccountValues      = pickSeries(lsaSeries, ['Long Account'])
    const shortAccountValues     = pickSeries(lsaSeries, ['Short Account'])

    // Positions (ใหม่)
    const lspSeries = longShortPosition?.data?.series ?? []
    const longShortPositionValues = pickSeries(lspSeries, ['Long/Short Ratio'])
    const longPositionValues      = pickSeries(lspSeries, ['Long Account',])
    const shortPositionValues     = pickSeries(lspSeries, ['Short Account'])

    // Global (ใหม่)
    const glsSeries = globalLongShort?.data?.series ?? []
    const globalLongShortValues = pickSeries(glsSeries, ['Long/Short Ratio'])
    const globallongValues      = pickSeries(glsSeries, ['Long Account'])
    const globalshortValues     = pickSeries(glsSeries, ['Short Account'])

    // Taker
    const trSeries = takerRatio?.data?.series ?? []
    const takerBuyValues        = pickSeries(trSeries, ['Buy Vol'])
    const takerSellValues       = pickSeries(trSeries, ['Sell Vol'])
    const takerBSRatioValues    = pickSeries(trSeries, ['Buy/Sell Ratio'])

    // Basis
    const bsSeries = basis?.data?.series ?? []
    const futuresPriceValues    = pickSeries(bsSeries, ['futures', 'futuresPrice', 'markPrice', 'Futures'])
    const priceIndexValues      = pickSeries(bsSeries, ['index', 'priceIndex', 'indexPrice', 'Index'])
    const basisValues           = pickSeries(bsSeries, ['basis', 'Basis'])

    // รองรับกรณี endpoint ส่ง array ตรง ๆ
    const ensureArrayOr = (obj: any, fallback: any[]) =>
      (Array.isArray(obj?.data) ? obj.data : fallback)

    const lsaRatio = longShortAccountValues.length ? longShortAccountValues : ensureArrayOr(longShortAccount, [])
    const lspRatio = longShortPositionValues.length ? longShortPositionValues : ensureArrayOr(longShortPosition, [])
    const glsRatio = globalLongShortValues.length ? globalLongShortValues : ensureArrayOr(globalLongShort, [])

    return xAxis.map((timestamp: number, i: number) => {
      const thaiTime = new Date(timestamp).toLocaleTimeString('th-TH', {
        hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
      })

      // Accounts
      const accRatio = num(lsaRatio[i])
      let longAcc = num(longAccountValues[i])
      let shortAcc = num(shortAccountValues[i])
      if (!longAcc && !shortAcc && accRatio > 0) {
        shortAcc = 100 / (1 + accRatio)
        longAcc = 100 - shortAcc
      }

      // Positions
      const posRatio = num(lspRatio[i])
      let longPos = num(longPositionValues[i])
      let shortPos = num(shortPositionValues[i])
      if (!longPos && !shortPos && posRatio > 0) {
        shortPos = 100 / (1 + posRatio)
        longPos = 100 - shortPos
      }

      // Global
      const globalRatio = num(glsRatio[i])
      let globalLong = num(globallongValues[i])
      let globalShort = num(globalshortValues[i])
      if (!globalLong && !globalShort && globalRatio > 0) {
        globalShort = 100 / (1 + globalRatio)
        globalLong = 100 - globalShort
      }

      // Taker
      const tBuy = num(takerBuyValues[i])
      const tSell = num(takerSellValues[i])
      const tBS = num(takerBSRatioValues[i]) || (tSell ? (tBuy || 0) / tSell : 0)

      // Prices & Basis
      const fut = num(futuresPriceValues[i])
      const idx = num(priceIndexValues[i])
      const bVal = (basisValues[i] != null ? num(basisValues[i]) : (fut && idx ? fut - idx : 0))

      return {
        time: thaiTime,
        timestamp,

        // OI
        openInterest: num(openInterestValues[i]),
        notionalValue: num(notionalValueValues[i]),

        // Accounts
        longShortAccounts: accRatio || 0,
        longAccount: longAcc || 0,
        shortAccount: shortAcc || 0,

        // Positions
        longShortPositions: posRatio || 0,
        longPosition: longPos || 0,
        shortPosition: shortPos || 0,

        // Global
        longShortRatio: globalRatio || 0,
        globalLongAccount: globalLong || 0,
        globalShortAccount: globalShort || 0,

        // Taker
        takerBuy: tBuy || 0,
        takerSell: tSell || 0,
        takerBuySellRatio: tBS || 0,

        // Prices & Basis
        futuresPrice: fut || 0,
        priceIndex: idx || 0,
        basis: bVal || 0,
      }
    })
  }


  const fetchData = async () => {
    // Prevent duplicate API calls
    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true
    setIsLoading(true)
    setApiError(false)

    try {
      const periodMinutes = Number.parseInt(period)
      const baseUrl = "https://www.binance.com"

      const proxyUrl = '/api/binance'

    // 1. Open Interest Statistics - POST request
    const openInterestStatsCall = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/bapi/futures/v1/public/future/data/open-interest-stats',
        method: 'POST',
        body: { name: symbol, periodMinutes }
      })
    })

    // 2. Long Short Account Ratio - POST request
    const longShortAccountRatioCall = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/bapi/futures/v1/public/future/data/long-short-account-ratio',
        method: 'POST',
        body: { name: symbol, periodMinutes }
      })
    })

    // 3. Long Short Position Ratio - POST request
    const longShortPositionRatioCall = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/bapi/futures/v1/public/future/data/long-short-position-ratio',
        method: 'POST',
        body: { name: symbol, periodMinutes }
      })
    })

    // 4. Global Long Short Account Ratio - POST request
    const globalLongShortAccountRatioCall = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/bapi/futures/v1/public/future/data/global-long-short-account-ratio',
        method: 'POST',
        body: { name: symbol, periodMinutes }
      })
    })

    // 5. Taker Long Short Ratio - POST request
    const takerLongShortRatioCall = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/bapi/futures/v1/public/future/data/taker-long-short-ratio',
        method: 'POST',
        body: { name: symbol, periodMinutes }
      })
    })

    // 6. Basis Data - GET request
    const basisDataCall = fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/bapi/futures/v1/public/future/data/basis',
        method: 'GET',
        params: {
          period: `${periodMinutes}m`,
          limit: '30',
          pair: symbol,
          contractType: 'PERPETUAL'
        }
      })
    })

    // Execute all API calls in parallel
    const [
      openInterestStatsResponse,
      longShortAccountRatioResponse,
      longShortPositionRatioResponse,
      globalLongShortAccountRatioResponse,
      takerLongShortRatioResponse,
      basisDataResponse
    ] = await Promise.all([
      openInterestStatsCall,
      longShortAccountRatioCall,
      longShortPositionRatioCall,
      globalLongShortAccountRatioCall,
      takerLongShortRatioCall,
      basisDataCall
    ])

      // Check if any request failed
      if (
        !openInterestStatsResponse.ok ||
        !longShortAccountRatioResponse.ok ||
        !longShortPositionRatioResponse.ok ||
        !globalLongShortAccountRatioResponse.ok ||
        !takerLongShortRatioResponse.ok ||
        !basisDataResponse.ok
      ) {
        throw new Error("API request failed")
      }

      // Parse all responses
      const [
        openInterestStatsData,
        longShortAccountRatioData,
        longShortPositionRatioData,
        globalLongShortAccountRatioData,
        takerLongShortRatioData,
        basisDataResult,
      ] = await Promise.all([
        openInterestStatsResponse.json(),
        longShortAccountRatioResponse.json(),
        longShortPositionRatioResponse.json(),
        globalLongShortAccountRatioResponse.json(),
        takerLongShortRatioResponse.json(),
        basisDataResponse.json(),
      ])

      // // Debug: Log actual API responses
      // console.log('=== Long Short Account Ratio API Response ===')
      // console.log('Full response:', JSON.stringify(longShortAccountRatioData, null, 2))
      // console.log('Top level keys:', Object.keys(longShortAccountRatioData))
      // console.log('Data structure:', longShortAccountRatioData.data)
      // console.log('Data type:', typeof longShortAccountRatioData.data)
      // console.log('Is array:', Array.isArray(longShortAccountRatioData.data))

      // if (longShortAccountRatioData.data?.series) {
      //   console.log('Available series:', longShortAccountRatioData.data.series.map((s: any) => ({ name: s.name, dataLength: s.data?.length })))
      //   console.log('Sample series data:', longShortAccountRatioData.data.series[0])
      // }

      // console.log('=== Long Short Position Ratio API Response ===')
      // console.log('Full response:', JSON.stringify(longShortPositionRatioData, null, 2))
      // console.log('Top level keys:', Object.keys(longShortPositionRatioData))
      // console.log('Data structure:', longShortPositionRatioData.data)
      // console.log('Data type:', typeof longShortPositionRatioData.data)
      // console.log('Is array:', Array.isArray(longShortPositionRatioData.data))

      // if (longShortPositionRatioData.data?.series) {
      //   console.log('Available series:', longShortPositionRatioData.data.series.map((s: any) => ({ name: s.name, dataLength: s.data?.length })))
      //   console.log('Sample series data:', longShortPositionRatioData.data.series[0])
      // }

      const combinedData = combineApiData(
        openInterestStatsData,
        longShortAccountRatioData,
        longShortPositionRatioData,
        globalLongShortAccountRatioData,
        takerLongShortRatioData,
        basisDataResult,
      )

      setData(combinedData)
      setApiError(false)
    } catch (error) {
      console.error("[v0] Error fetching trading data:", error)
      setApiError(true)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 100) // 100ms debounce

    return () => {
      clearTimeout(timeoutId)
    }
  }, [symbol, period])

  return { data, isLoading, apiError, refetch: fetchData }
}