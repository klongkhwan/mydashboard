import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    console.log(`🕐 Running scheduled tasks at ${currentTime} on day ${currentDay}`)

    // Get active schedules that should run now
    const { data: schedules, error } = await supabase
      .from('api_schedules')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('time', currentTime)

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      console.log('No schedules to run at this time')
      return NextResponse.json({ message: 'No schedules to run', count: 0 })
    }

    console.log(`Found ${schedules.length} schedules to run`)

    const results = []

    // Run each schedule
    for (const schedule of schedules) {
      try {
        // Check if this schedule should run today (for weekly frequency)
        if (schedule.frequency === 'WEEKLY' && currentDay !== 1) { // Monday = 1
          continue
        }

        console.log(`Running schedule: ${schedule.api_name}`)

        // Prepare request
        const headers = schedule.headers || {}
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
          ...(body && { body: JSON.stringify(body) }),
        })

        const success = response.ok
        const statusCode = response.status

        // Update last_run and next_run
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
        })

        console.log(`✅ ${schedule.api_name}: ${success ? 'SUCCESS' : 'FAILED'} (${statusCode})`)

      } catch (error) {
        console.error(`❌ Error running ${schedule.api_name}:`, error)
        results.push({
          id: schedule.id,
          api_name: schedule.api_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: 'Cron job completed',
      count: results.length,
      results,
      timestamp: now.toISOString(),
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}