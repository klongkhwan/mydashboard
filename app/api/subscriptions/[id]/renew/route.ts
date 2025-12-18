import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id } = await params

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { start_date, next_billing_date } = body

    // Get the old subscription
    const { data: oldSub, error: fetchError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

    if (fetchError || !oldSub) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Mark old subscription as "completed"
    const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: "completed" })
        .eq("id", id)

    if (updateError) {
        return NextResponse.json({ error: "Failed to update old subscription" }, { status: 500 })
    }

    // Create new subscription with new dates
    const { error: insertError, data: newSub } = await supabase
        .from("subscriptions")
        .insert({
            name: oldSub.name,
            type: oldSub.type,
            price: oldSub.price,
            billing_cycle: oldSub.billing_cycle,
            status: "active",
            payment_method: oldSub.payment_method,
            notes: oldSub.notes,
            user_id: user.id,
            start_date: start_date,
            next_billing_date: next_billing_date,
        })
        .select()
        .single()

    if (insertError) {
        return NextResponse.json({ error: "Failed to create new subscription" }, { status: 500 })
    }

    return NextResponse.json(newSub, { status: 201 })
}
