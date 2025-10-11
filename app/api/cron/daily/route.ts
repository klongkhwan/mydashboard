import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Cron endpoint - use POST method',
    usage: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_CRON_SECRET (optional)'
      },
      note: 'This endpoint is triggered automatically by Vercel cron jobs'
    },
    test_command: 'curl -X POST https://your-domain.vercel.app/api/cron/daily -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_CRON_SECRET"'
  })
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron job secret (optional security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.

    console.log(`🕐 Running daily cron job at ${now.toISOString()}`)

    // Get all active daily schedules (regardless of time, since this runs once per day)
    const { data: schedules, error } = await supabase
      .from('api_schedules')
      .select('*')
      .eq('status', 'ACTIVE')
      .in('frequency', ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      console.log('No active schedules found')
      return NextResponse.json({ message: 'No schedules to run', count: 0 })
    }

    console.log(`Found ${schedules.length} active schedules`)

    const results = []

    // Run each schedule
    for (const schedule of schedules) {
      try {
        // Check if this schedule should run today based on frequency
        const shouldRunToday = checkIfShouldRunToday(schedule, currentDay)
        if (!shouldRunToday) {
          continue
        }

        // For time-based schedules, only run if the current time matches
        if (schedule.frequency === 'DAILY' && schedule.time !== currentTime) {
          continue
        }

        console.log(`Running schedule: ${schedule.api_name}`)

        // Prepare request
        let headers = {}
        if (schedule.headers) {
          try {
            headers = typeof schedule.headers === 'string'
              ? JSON.parse(schedule.headers)
              : schedule.headers
          } catch (error) {
            console.warn('Failed to parse headers:', schedule.headers, error)
            headers = {}
          }
        }

        const body = schedule.body

        // Use proxy for PropertyHub to avoid CORS
        let fullUrl = schedule.url
        if (schedule.url.includes('propertyhub.in.th/graphql')) {
          fullUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/proxy/graphql`
        } else if (!schedule.url.startsWith('http')) {
          fullUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${schedule.url}`
        }

        // Execute the API call
        const response = await fetch(fullUrl, {
          method: schedule.method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          ...(body && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        })

        const success = response.ok
        const statusCode = response.status

        // Update last_run
        await supabase
          .from('api_schedules')
          .update({
            last_run: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', schedule.id)

        results.push({
          id: schedule.id,
          api_name: schedule.api_name,
          success,
          status_code: statusCode,
          url: fullUrl,
          frequency: schedule.frequency,
        })

        console.log(`✅ ${schedule.api_name}: ${success ? 'SUCCESS' : 'FAILED'} (${statusCode})`)

      } catch (error) {
        console.error(`❌ Error running ${schedule.api_name}:`, error)
        results.push({
          id: schedule.id,
          api_name: schedule.api_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          frequency: schedule.frequency,
        })
      }
    }

    return NextResponse.json({
      message: 'Daily cron job completed',
      count: results.length,
      results,
      timestamp: now.toISOString(),
    })

  } catch (error) {
    console.error('Daily cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function checkIfShouldRunToday(schedule: any, currentDay: number): boolean {
  switch (schedule.frequency) {
    case 'DAILY':
      return true
    case 'WEEKLY':
      // Run on Monday (day 1) for weekly schedules
      return currentDay === 1
    case 'MONTHLY':
      // Run on the 1st of the month
      const now = new Date()
      return now.getDate() === 1
    case 'CUSTOM':
      // For custom schedules (every 6 hours), run every time
      return true
    default:
      return false
  }
}