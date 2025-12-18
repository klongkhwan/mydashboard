import { z } from "zod"

export const subscriptionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be positive"),
    billing_cycle: z.enum(["monthly", "yearly", "weekly"]),
    next_billing_date: z.date({
        required_error: "Next billing date is required",
    }),
    start_date: z.date().optional(),
    status: z.enum(["active", "canceled", "paused", "completed"]).default("active"),
    payment_method: z.string().optional(),
    notes: z.string().optional(),
})

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>
