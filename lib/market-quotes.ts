export interface AssetQuote {
  symbol: string
  price: number
  source: "binance" | "yahoo"
}

/**
 * Fetches real-time USD/THB exchange rate with 30-minute caching.
 */
export async function getUsdThbRate(): Promise<number> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/THB=X?interval=1d&range=1d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 1800 },
      }
    )
    if (res.ok) {
      const data = await res.json()
      const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (typeof rate === "number" && rate > 0) {
        return Math.round(rate * 100) / 100
      }
    }
  } catch {}
  // shortcut: default 34.0 fallback rate if network fails, upgrade to dedicated forex service if needed
  return 34.0
}

/**
 * Fetches price for a single asset with 30-minute caching (1800 seconds).
 * For stocks (thai_stock, foreign_stock), queries Yahoo Finance directly.
 * For crypto or unspecified types, tries Binance first, then Yahoo Finance.
 */
export async function getAssetQuote(
  rawSymbol: string,
  investmentType?: string
): Promise<AssetQuote | null> {
  if (!rawSymbol || typeof rawSymbol !== "string") return null
  const clean = rawSymbol.trim().toUpperCase()
  if (!clean) return null

  const isStock = investmentType === "thai_stock" || investmentType === "foreign_stock"

  // 1. If stock: Query Yahoo Finance directly (skip Binance to avoid 400 Bad Request)
  if (isStock) {
    const yahooSymbols = investmentType === "thai_stock" && !clean.endsWith(".BK")
      ? [`${clean}.BK`, clean]
      : [clean]

    for (const sym of yahooSymbols) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
          {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 1800 },
            signal: AbortSignal.timeout(3500),
          }
        )
        if (res.ok) {
          const data = await res.json()
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (typeof price === "number" && price > 0) {
            return { symbol: clean, price, source: "yahoo" }
          }
        }
      } catch {}
    }
    return null
  }

  // 2. Try Binance Global & Binance US (Crypto)
  const baseCrypto = clean.replace(/(USDT|BUSD|USDC)$/, "")
  const cryptoSymbol = `${baseCrypto}USDT`

  for (const endpoint of [
    `https://api.binance.com/api/v3/ticker/price?symbol=${cryptoSymbol}`,
    `https://api.binance.us/api/v3/ticker/price?symbol=${cryptoSymbol}`,
  ]) {
    try {
      const res = await fetch(endpoint, {
        next: { revalidate: 1800 }, // 30-minute cache
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json()
        const price = parseFloat(data.price)
        if (!isNaN(price) && price > 0) {
          return { symbol: clean, price, source: "binance" }
        }
      }
    } catch {}
  }

  // 3. Fallback to Yahoo Finance (Crypto: use BASE-USD e.g. SOL-USD, then raw clean)
  const yahooCryptoSymbols = baseCrypto ? [`${baseCrypto}-USD`, clean] : [clean]
  for (const sym of yahooCryptoSymbols) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 1800 },
          signal: AbortSignal.timeout(3500),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
        if (typeof price === "number" && price > 0) {
          return { symbol: clean, price, source: "yahoo" }
        }
      }
    } catch {}
  }

  return null
}

/**
 * Batch fetches quotes for unique symbols.
 * Accepts either an array of symbols (string[]) or items with investmentType.
 * Returns a dictionary mapping uppercase symbol to AssetQuote.
 */
export async function getBatchAssetQuotes(
  items: Array<string | { symbol: string; investmentType?: string }>
): Promise<Record<string, AssetQuote>> {
  const normalized = items
    .map((item) => {
      if (typeof item === "string") {
        return { symbol: (item || "").trim().toUpperCase(), investmentType: undefined }
      }
      return {
        symbol: (item?.symbol || "").trim().toUpperCase(),
        investmentType: item?.investmentType,
      }
    })
    .filter((item) => Boolean(item.symbol))

  // Deduplicate by symbol (preferring items with defined investmentType)
  const uniqueMap = new Map<string, string | undefined>()
  for (const item of normalized) {
    if (!uniqueMap.has(item.symbol) || (!uniqueMap.get(item.symbol) && item.investmentType)) {
      uniqueMap.set(item.symbol, item.investmentType)
    }
  }

  const unique = Array.from(uniqueMap.entries())
  const results = await Promise.allSettled(
    unique.map(([symbol, investmentType]) => getAssetQuote(symbol, investmentType))
  )
  const map: Record<string, AssetQuote> = {}

  results.forEach((res, index) => {
    if (res.status === "fulfilled" && res.value) {
      const sym = unique[index][0]
      const invType = unique[index][1]
      const isStock = invType === "thai_stock" || invType === "foreign_stock" || sym.includes(".BK")
      map[sym] = res.value
      const base = sym.replace(/(USDT|BUSD|USDC)$/, "")
      if (base && base !== sym) {
        map[base] = res.value
      } else if (base && !isStock) {
        map[`${base}USDT`] = res.value
      }
    }
  })

  return map
}
