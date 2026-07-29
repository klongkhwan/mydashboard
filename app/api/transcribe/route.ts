import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { videoUrl, language = 'th' } = body ?? {}

        if (!videoUrl) {
            return NextResponse.json({ success: false, error: 'กรุณาระบุ videoUrl' }, { status: 400 })
        }

        // Placeholder implementation: returns sample captions quickly so UI can work end-to-end.
        const subtitles = [
            { id: crypto.randomUUID(), startTime: 0.5, endTime: 2.4, text: language === 'th' ? 'เริ่มต้นด้วยประโยคที่ดึงดูดคนดู' : 'Start with a strong hook' },
            { id: crypto.randomUUID(), startTime: 2.6, endTime: 5.1, text: language === 'th' ? 'เน้นจังหวะตัดต่อให้กระชับ' : 'Keep the edit tight and engaging' },
            { id: crypto.randomUUID(), startTime: 5.3, endTime: 8.0, text: language === 'th' ? 'ใส่ข้อความสั้น อ่านง่าย' : 'Use short, readable text' },
        ]

        return NextResponse.json({
            success: true,
            subtitles,
            language,
        })
    } catch (error) {
        console.error('Transcribe error:', error)
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการสร้างคำบรรยาย' }, { status: 500 })
    }
}
