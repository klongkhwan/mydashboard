"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { subscriptionSchema, SubscriptionFormValues } from "./schema"

export async function getSubscriptions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("next_billing_date", { ascending: true })

    if (error) {
        console.error("Error fetching subscriptions:", error)
        return []
    }

    return data
}

export async function createSubscription(values: SubscriptionFormValues) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Unauthorized" }
    }

    const { error } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        name: values.name,
        type: values.type,
        price: values.price,
        billing_cycle: values.billing_cycle,
        status: values.status,
        payment_method: values.payment_method,
        notes: values.notes,
        next_billing_date: values.next_billing_date,
        start_date: values.start_date,
    })

    if (error) {
        console.error("Error creating subscription:", error)
        return { error: "Failed to create subscription" }
    }

    revalidatePath("/dashboard/subscriptions")
    return { success: true }
}

export async function updateSubscription(id: string, values: SubscriptionFormValues) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("subscriptions")
        .update({
            name: values.name,
            type: values.type,
            price: values.price,
            billing_cycle: values.billing_cycle,
            status: values.status,
            payment_method: values.payment_method,
            notes: values.notes,
            next_billing_date: values.next_billing_date,
            start_date: values.start_date,
        })
        .eq("id", id)

    if (error) {
        console.error("Error updating subscription:", error)
        return { error: "Failed to update subscription" }
    }

    revalidatePath("/dashboard/subscriptions")
    return { success: true }
}

export async function deleteSubscription(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id)

    if (error) {
        console.error("Error deleting subscription:", error)
        return { error: "Failed to delete subscription" }
    }

    revalidatePath("/dashboard/subscriptions")
    return { success: true }
}

export async function cancelSubscription(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("id", id)

    if (error) {
        console.error("Error canceling subscription:", error)
        return { error: "Failed to cancel subscription" }
    }

    revalidatePath("/dashboard/subscriptions")
    return { success: true }
}

export async function renewSubscription(id: string, newStartDate: Date, newBillingDate: Date) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Unauthorized" }
    }

    // Get the old subscription
    const { data: oldSub, error: fetchError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", id)
        .single()

    if (fetchError || !oldSub) {
        return { error: "Failed to find subscription" }
    }

    // Mark old subscription as "completed" (จบครบ)
    const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: "completed" })
        .eq("id", id)

    if (updateError) {
        return { error: "Failed to update old subscription" }
    }

    // Create new subscription with new dates and active status
    const { error: insertError } = await supabase.from("subscriptions").insert({
        name: oldSub.name,
        type: oldSub.type,
        price: oldSub.price,
        billing_cycle: oldSub.billing_cycle,
        status: "active",
        payment_method: oldSub.payment_method,
        notes: oldSub.notes,
        user_id: user.id,
        start_date: newStartDate.toISOString().split('T')[0],
        next_billing_date: newBillingDate.toISOString().split('T')[0],
    })

    if (insertError) {
        return { error: "Failed to create new subscription" }
    }

    revalidatePath("/dashboard/subscriptions")
    return { success: true }
}
