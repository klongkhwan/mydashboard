import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // GraphQL endpoint for PropertyHub
    const graphqlEndpoint = 'https://api.propertyhub.in.th/graphql'

    // Exact headers from curl - use hardcoded values that work
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-GB,en;q=0.9',
      'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjIyMjQ0LCJlbWFpbCI6InJrMTE2NzlAZ21haWwuY29tIiwicm9sZSI6Ik1FTUJFUiIsInNhbHQiOiI5OTg0MTg2MzgzMTYwODU2OTY3IiwiaWF0IjoxNzU5OTM0OTY3LCJleHAiOjE3Njc3MTA5Njd9.rpKmygX-plzkoUhE4wWAhtFS8wVToajdb65cISguvog',
      'content-type': 'application/json',
      'locale': 'TH',
      'origin': 'https://dashboard.propertyhub.in.th',
      'referer': 'https://dashboard.propertyhub.in.th/',
    }

    // Make the GraphQL request to PropertyHub - exactly like curl
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('Proxy GraphQL Error:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}