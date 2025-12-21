import { supabase } from './supabase'
import { ApiSchedule, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/api-scheduler'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Asia/Bangkok'

export async function getSchedules(): Promise<ApiSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('api_schedules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching schedules:', error)
    throw error
  }
}

export async function createSchedule(request: CreateScheduleRequest): Promise<ApiSchedule> {
  try {
    // Calculate initial next_run
    let nextRun = request.status === 'ACTIVE'
      ? calculateNextRun(request.frequency, request.time, request.cron_expression)
      : null

    const { data, error } = await supabase
      .from('api_schedules')
      .insert({
        ...request,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_run: null,
        next_run: nextRun,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating schedule:', error)
    throw error
  }
}

export async function updateSchedule(request: UpdateScheduleRequest): Promise<ApiSchedule> {
  try {
    const { id, ...updateData } = request
    const { data, error } = await supabase
      .from('api_schedules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating schedule:', error)
    throw error
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_schedules')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting schedule:', error)
    throw error
  }
}


export async function toggleScheduleStatus(id: string): Promise<ApiSchedule> {
  try {
    // First get current status
    const { data: current, error: fetchError } = await supabase
      .from('api_schedules')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const newStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

    // Recalculate next_run if activating
    let nextRun = undefined
    if (newStatus === 'ACTIVE') {
      const { data: schedule } = await supabase
        .from('api_schedules')
        .select('frequency, time, cron_expression')
        .eq('id', id)
        .single()

      if (schedule) {
        nextRun = calculateNextRun(schedule.frequency, schedule.time, schedule.cron_expression)
      }
    }

    const { data, error } = await supabase
      .from('api_schedules')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(nextRun && { next_run: nextRun })
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error toggling schedule status:', error)
    throw error
  }
}

// --- Scheduler Logic ---

function calculateNextRun(frequency: ApiSchedule['frequency'], timeStr: string, cronExpression?: string | null): string {
  // Get current time in Bangkok
  const now = new Date()
  const bangkokNow = toZonedTime(now, TIMEZONE)

  // Parse target time HH:MM
  const [hours, minutes] = timeStr.split(':').map(Number)

  // Create target date in Bangkok
  let nextBangkokDate = new Date(bangkokNow)
  nextBangkokDate.setHours(hours, minutes, 0, 0)

  if (frequency === 'CUSTOM' && cronExpression) {
    // Basic fallback for custom: +6 hours from now
    const nextDate = new Date(now)
    nextDate.setHours(nextDate.getHours() + 6)
    return nextDate.toISOString()
  }

  // If the target time has already passed today in Bangkok, move to the next occurrence
  if (nextBangkokDate <= bangkokNow) {
    if (frequency === 'DAILY') {
      nextBangkokDate.setDate(nextBangkokDate.getDate() + 1)
    } else if (frequency === 'WEEKLY') {
      nextBangkokDate.setDate(nextBangkokDate.getDate() + 7)
    } else if (frequency === 'MONTHLY') {
      nextBangkokDate.setMonth(nextBangkokDate.getMonth() + 1)
    }
  }

  // Convert the calculated Bangkok time back to UTC for storage
  const nextRunUTC = fromZonedTime(nextBangkokDate, TIMEZONE)
  return nextRunUTC.toISOString()
}

export async function checkAndRunDueSchedules(): Promise<{ executed: number; errors: number; details: any[] }> {
  try {
    // 1. Fetch due schedules
    const now = new Date().toISOString()
    const { data: schedules, error } = await supabase
      .from('api_schedules')
      .select('*')
      .eq('status', 'ACTIVE')
      .or(`next_run.is.null,next_run.lte.${now}`)

    if (error) throw error
    if (!schedules || schedules.length === 0) return { executed: 0, errors: 0, details: [] }

    const results = []
    let successCount = 0
    let errorCount = 0

    // 2. Process each schedule
    for (const schedule of schedules) {
      try {
        console.log(`Executing schedule: ${schedule.api_name}`)

        // Prepare headers and body
        let headers = {}
        if (schedule.headers) {
          try {
            headers = typeof schedule.headers === 'string' ? JSON.parse(schedule.headers) : schedule.headers
          } catch (e) { console.error('Invalid headers JSON', e) }
        }

        let body = undefined
        if (schedule.body) {
          body = typeof schedule.body === 'string' ? schedule.body : JSON.stringify(schedule.body)
        }

        // Prepare request headers - Align with manual trigger to avoid being blocked
        let requestHeaders: Record<string, string> = {
          'accept': '*/*',
          'accept-language': 'en-GB,en;q=0.9',
          'Content-Type': 'application/json',
          'locale': 'TH',
          'origin': 'https://dashboard.propertyhub.in.th',
          'referer': 'https://dashboard.propertyhub.in.th/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...headers
        }

        let fullUrl = schedule.url
        // Handle PropertyHub specially if it's using the proxy URL in data
        const isPropertyHub = fullUrl.includes('/api/proxy/graphql') || fullUrl.includes('propertyhub.in.th/graphql')

        if (isPropertyHub) {
          fullUrl = 'https://api.propertyhub.in.th/graphql'
          // Inject the hardcoded PropertyHub token if not present
          if (!requestHeaders['authorization'] && !requestHeaders['Authorization']) {
            requestHeaders['authorization'] = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjIyMjQ0LCJlbWFpbCI6InJrMTE2NzlAZ21haWwuY29tIiwicm9sZSI6Ik1FTUJFUiIsInNhbHQiOiI5OTg0MTg2MzgzMTYwODU2OTY3IiwiaWF0IjoxNzU5OTM0OTY3LCJleHAiOjE3Njc3MTA5Njd9.rpKmygX-plzkoUhE4wWAhtFS8wVToajdb65cISguvog'
          }
        } else if (!fullUrl.startsWith('http')) {
          if (process.env.NEXT_PUBLIC_APP_URL) {
            fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`
          } else {
            console.warn(`Skipping relative URL without base URL: ${fullUrl}`)
            throw new Error('Relative URL requires NEXT_PUBLIC_APP_URL environment variable')
          }
        }

        // Execute Request
        const response = await fetch(fullUrl, {
          method: schedule.method,
          headers: requestHeaders,
          body: body
        })

        const resultStatus = response.ok ? 'Success' : `Failed (${response.status})`

        // Calculate next run
        const nextRun = calculateNextRun(schedule.frequency, schedule.time, schedule.cron_expression)

        // Update Schedule
        await supabase
          .from('api_schedules')
          .update({
            last_run: now,
            next_run: nextRun,
            // We could update status to FAILED if we want to pause on failure, 
            // but usually we keep retrying next time or add a discrete 'error_count'.
            // For now, keep ACTIVE.
          })
          .eq('id', schedule.id)

        results.push({ id: schedule.id, name: schedule.api_name, status: resultStatus, next_run: nextRun })
        if (response.ok) successCount++
        else errorCount++

      } catch (innerError) {
        console.error(`Failed to execute schedule ${schedule.id}:`, innerError)
        errorCount++
        results.push({ id: schedule.id, name: schedule.api_name, status: 'Error', error: String(innerError) })

        // Attempt to update last_run even on error so it doesn't loop infinitely if immediate retry isn't desired
        // Or better: set next_run to retry later (e.g. 1 hour) or just next schedule
        const nextRun = calculateNextRun(schedule.frequency, schedule.time, schedule.cron_expression)
        await supabase.from('api_schedules').update({ last_run: now, next_run: nextRun }).eq('id', schedule.id)
      }
    }

    return { executed: successCount, errors: errorCount, details: results }

  } catch (error) {
    console.error('Error in checkAndRunDueSchedules:', error)
    throw error
  }
}