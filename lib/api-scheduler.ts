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
    const { data, error } = await supabase
      .from('api_schedules')
      .insert({
        ...request,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_run: null,
        next_run: null,
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