import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://www.binance.com'

interface BinanceRequest {
  endpoint: string
  method?: 'GET' | 'POST'
  body?: any
  params?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const body: BinanceRequest = await request.json()
    const { endpoint, method = 'POST', body: requestBody, params } = body

    let url = `${BASE_URL}${endpoint}`

    // Add query parameters for GET requests
    if (method === 'GET' && params) {
      const queryString = new URLSearchParams(params).toString()
      url += `?${queryString}`
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }

    // Add body for POST requests
    if (method === 'POST' && requestBody) {
      fetchOptions.body = JSON.stringify(requestBody)
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Binance API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Binance' },
      { status: 500 }
    )
  }
}