import { NextRequest, NextResponse } from 'next/server'
import { checkAndRunDueSchedules } from '@/lib/api-scheduler'
import { checkActivePriceAlerts } from '@/lib/alert-checker'

export const dynamic = 'force-dynamic' // Ensure this is not cached

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const [scheduleResult, alertResult] = await Promise.all([
            checkAndRunDueSchedules(),
            checkActivePriceAlerts(),
        ])

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...scheduleResult,
            schedules: scheduleResult,
            priceAlerts: alertResult,
        })
    } catch (error) {
        console.error('Cron job failed:', error)
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        )
    }
}
