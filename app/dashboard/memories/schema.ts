import { z } from "zod"

export const memoryLogSchema = z.object({
    title: z.string().min(1, "กรุณากรอกหัวข้อ"),
    date: z.date({
        required_error: "กรุณาเลือกวันที่",
    }),
    location: z.string().optional(),
    description: z.string().optional(),
    mood: z.string().max(255).optional(),
})

export type MemoryLogFormValues = z.infer<typeof memoryLogSchema>

export interface MemoryPhoto {
    id: string
    memory_log_id: string
    photo_url: string
    created_at: string
}

export interface MemoryLog {
    id: string
    user_id: string
    title: string
    date: string
    location: string | null
    description: string | null
    mood: string | null
    created_at: string
    updated_at: string
    memory_photos: MemoryPhoto[]
}
