import { NextRequest, NextResponse } from 'next/server'
import { checkAndRunDueSchedules } from '@/lib/api-scheduler'

export const dynamic = 'force-dynamic' // Ensure this is not cached

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const result = await checkAndRunDueSchedules()

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...result
        })
    } catch (error) {
        console.error('Cron job failed:', error)
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        )
    }
}
