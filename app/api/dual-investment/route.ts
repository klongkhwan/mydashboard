import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from the request
    const { searchParams } = new URL(request.url);

    // Build the URL for Binance API
    const baseUrl = 'https://www.binance.com/bapi/earn/v5/friendly/pos/dc/project/list';
    const binanceUrl = `${baseUrl}?${searchParams.toString()}`;

    console.log('Fetching from Binance API:', binanceUrl);

    // Make request to Binance API
    const response = await fetch(binanceUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://www.binance.com',
        'Referer': 'https://www.binance.com/',
      },
    });

    if (!response.ok) {
      console.error('Binance API error:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Binance API response received');

    // Return the data from Binance API
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in dual investment API route:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch dual investment data',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'API_ERROR',
        data: { total: "0", list: [] }
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}