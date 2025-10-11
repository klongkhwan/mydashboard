export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'FAILED'

export interface ApiSchedule {
  id: string
  created_at: string
  updated_at: string
  api_name: string
  url: string
  method: Method
  headers: string | null  // Store as JSON string
  body: string | null      // Store as JSON string
  time: string
  frequency: Frequency
  cron_expression: string | null
  status: ScheduleStatus
  last_run: string | null
  next_run: string | null
}

export interface CreateScheduleRequest {
  api_name: string
  url: string
  method: Method
  headers?: string
  body?: string
  time: string
  frequency: Frequency
  cron_expression?: string
  status?: ScheduleStatus
}

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  id: string
  last_run?: string
}