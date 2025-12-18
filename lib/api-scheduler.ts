import { supabase } from './supabase'
import { ApiSchedule, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/api-scheduler'

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

    const { data, error } = await supabase
      .from('api_schedules')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
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
  const now = new Date()
  let nextDate = new Date()

  // Parse time string (HH:MM)
  const [hours, minutes] = timeStr.split(':').map(Number)

  if (frequency === 'CUSTOM' && cronExpression) {
    // TODO: Implement actual cron parsing if needed. 
    // For now, if it's custom/cron, we might default to a simple interval or skip.
    // Let's assume a simple fallback or implement a basic interval if needed.
    // For this MVP, we will handle the standard frequencies robustly.
    // If "Every 6 hrs" is desired (as hinted in UI), we can add specific logic here.

    // Fallback: Add 6 hours if custom
    nextDate.setHours(nextDate.getHours() + 6)
    return nextDate.toISOString()
  }

  // Set the target time on the current date
  nextDate.setHours(hours, minutes, 0, 0)

  // If the time has already passed today, advance based on frequency
  if (nextDate <= now) {
    if (frequency === 'DAILY') {
      nextDate.setDate(nextDate.getDate() + 1)
    } else if (frequency === 'WEEKLY') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else if (frequency === 'MONTHLY') {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
  }

  // Handle specific frequency logic if it wasn't already passed but needs specific day alignment
  // (Simplified for now: Daily/Weekly/Monthly from *now* or *today's scheduled time*)
  // The above logic covers "Next occurrence of HH:MM" for Daily.
  // weekly/monthly might need specific "Day of week" logic if not just "7 days from now".
  // For basic MVP: "Daily at X" means every day. "Weekly" means every 7 days from the start? 
  // Usually generic "Weekly" implies "Same day next week". The current logic preserves the day if it hasn't passed, or adds 7 days.

  return nextDate.toISOString()
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

        // Construct URL (Handle relative or proxy URLs as in existing UI logic if possible, 
        // but server-side fetch needs absolute URLs. Since this runs on server/cron, 
        // local relative URLs like '/api/...' won't work unless base URL is known.
        // We assume users provide full URLs or we have a BASE_URL env var.)
        let fullUrl = schedule.url
        if (!fullUrl.startsWith('http')) {
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
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SuperlBoard-Scheduler/1.0',
            ...headers
          },
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