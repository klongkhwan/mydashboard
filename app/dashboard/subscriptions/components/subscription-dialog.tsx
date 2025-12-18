"use client"

import { Button } from "@/components/ui/button"
import { Modal, DialogTrigger } from "@/components/ui/modal"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { subscriptionSchema, SubscriptionFormValues } from "../schema"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { DatePicker } from "@/components/ui/date-picker"

interface SubscriptionDialogProps {
    subscription?: any // Replace with proper type from DB
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function SubscriptionDialog({
    subscription,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    trigger,
    onSuccess,
}: SubscriptionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [subData, setSubData] = useState<any>(subscription)
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : open
    const onOpenChange = isControlled ? controlledOnOpenChange : setOpen

    const { toast } = useToast()

    const getDefaultValues = () => ({
        name: subData?.name || "",
        type: subData?.type || "",
        price: subData?.price || 0,
        billing_cycle: subData?.billing_cycle || "monthly",
        next_billing_date: subData?.next_billing_date ? new Date(subData.next_billing_date) : new Date(),
        start_date: subData?.start_date ? new Date(subData.start_date) : new Date(),
        status: subData?.status || "active",
        payment_method: subData?.payment_method || "",
        notes: subData?.notes || "",
    })

    const form = useForm<SubscriptionFormValues>({
        resolver: zodResolver(subscriptionSchema),
        defaultValues: getDefaultValues(),
    })

    const isEditing = !!subscription

    // Fetch subscription data when dialog opens for editing
    useEffect(() => {
        if (isOpen && isEditing && subscription?.id) {
            setLoading(true)
            fetch(`/api/subscriptions/${subscription.id}`)
                .then(res => res.json())
                .then(data => {
                    setSubData(data)
                    form.reset({
                        name: data.name || "",
                        type: data.type || "",
                        price: data.price || 0,
                        billing_cycle: data.billing_cycle || "monthly",
                        next_billing_date: data.next_billing_date ? new Date(data.next_billing_date) : new Date(),
                        start_date: data.start_date ? new Date(data.start_date) : new Date(),
                        status: data.status || "active",
                        payment_method: data.payment_method || "",
                        notes: data.notes || "",
                    })
                })
                .catch(() => toast({ title: "Error", description: "Failed to load subscription", variant: "destructive" }))
                .finally(() => setLoading(false))
        }
    }, [isOpen, isEditing, subscription?.id])

    // Reset form when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSubData(subscription)
            form.reset(getDefaultValues())
        }
    }, [isOpen])

    // Watch start_date and billing_cycle to auto-calculate next_billing_date
    const startDate = form.watch("start_date")
    const billingCycle = form.watch("billing_cycle")

    useEffect(() => {
        if (startDate && billingCycle && !isEditing) {
            const nextDate = new Date(startDate)
            switch (billingCycle) {
                case "weekly":
                    nextDate.setDate(nextDate.getDate() + 7)
                    break
                case "monthly":
                    nextDate.setMonth(nextDate.getMonth() + 1)
                    break
                case "yearly":
                    nextDate.setFullYear(nextDate.getFullYear() + 1)
                    break
            }
            form.setValue("next_billing_date", nextDate)
        }
    }, [startDate, billingCycle, isEditing, form])

    async function onSubmit(data: SubscriptionFormValues) {
        try {
            // Format date as YYYY-MM-DD using local timezone (not UTC)
            const formatDate = (date: Date) => {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
            }

            const formData = {
                name: data.name,
                type: data.type,
                price: data.price,
                billing_cycle: data.billing_cycle,
                status: data.status,
                payment_method: data.payment_method,
                notes: data.notes,
                next_billing_date: formatDate(data.next_billing_date),
                start_date: data.start_date ? formatDate(data.start_date) : undefined,
            }

            if (isEditing) {
                const res = await fetch(`/api/subscriptions/${subscription.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error('Failed to update')
                toast({ title: "อัปเดตแล้ว", description: "Subscription ถูกอัปเดตเรียบร้อย" })
            } else {
                const res = await fetch('/api/subscriptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })
                if (!res.ok) throw new Error('Failed to create')
                toast({ title: "สร้างแล้ว", description: "Subscription ถูกสร้างเรียบร้อย" })
            }
            onOpenChange?.(false)
            form.reset()
            onSuccess?.()
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        }
    }

    const defaultTrigger = (
        <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Subscription
        </Button>
    )

    return (
        <Modal
            open={isOpen}
            onOpenChange={onOpenChange}
            trigger={trigger || (!isControlled ? defaultTrigger : undefined)}
            title={isEditing ? "แก้ไข Subscription" : "เพิ่ม Subscription"}
            description={isEditing ? "แก้ไขรายละเอียด Subscription ของคุณ" : "กรอกรายละเอียดสำหรับ Subscription ใหม่"}
            variant="primary"
            size="lg"
            showSaveButton={false}
            showCancelButton={false}
            footer={null}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground font-medium">ชื่อบริการ</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="กรุณากรอกชื่อบริการ"
                                        {...field}
                                        className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground font-medium">ประเภท</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground">
                                                <SelectValue placeholder="เลือกประเภท" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-popover border border-border">
                                            <SelectItem value="Streaming" className="focus:bg-accent focus:text-accent-foreground">Streaming</SelectItem>
                                            <SelectItem value="Ai" className="focus:bg-accent focus:text-accent-foreground">AI</SelectItem>
                                            <SelectItem value="Software" className="focus:bg-accent focus:text-accent-foreground">Software</SelectItem>
                                            <SelectItem value="Cloud Service" className="focus:bg-accent focus:text-accent-foreground">Cloud Service</SelectItem>
                                            <SelectItem value="Gaming" className="focus:bg-accent focus:text-accent-foreground">Gaming</SelectItem>
                                            <SelectItem value="Utility" className="focus:bg-accent focus:text-accent-foreground">Utility</SelectItem>
                                            <SelectItem value="Skin Care" className="focus:bg-accent focus:text-accent-foreground">Skin Care</SelectItem>
                                            <SelectItem value="Other" className="focus:bg-accent focus:text-accent-foreground">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground font-medium">ราคา</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="billing_cycle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground font-medium">รอบการชำระ</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground">
                                                <SelectValue placeholder="เลือกรอบการชำระ" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-popover border border-border">
                                            <SelectItem value="weekly" className="focus:bg-accent focus:text-accent-foreground">รายสัปดาห์</SelectItem>
                                            <SelectItem value="monthly" className="focus:bg-accent focus:text-accent-foreground">รายเดือน</SelectItem>
                                            <SelectItem value="yearly" className="focus:bg-accent focus:text-accent-foreground">รายปี</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground font-medium">สถานะ</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground">
                                                <SelectValue placeholder="เลือกสถานะ" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-popover border border-border">
                                            <SelectItem value="active" className="focus:bg-accent focus:text-accent-foreground">Active</SelectItem>
                                            <SelectItem value="canceled" className="focus:bg-accent focus:text-accent-foreground">Canceled</SelectItem>
                                            <SelectItem value="paused" className="focus:bg-accent focus:text-accent-foreground">Paused</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="start_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-foreground font-medium">วันที่เริ่มต้น</FormLabel>
                                    <FormControl>
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="next_billing_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-foreground font-medium">วันชำระครั้งถัดไป</FormLabel>
                                    <FormControl>
                                        <DatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="payment_method"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground font-medium">วิธีการชำระเงิน</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground">
                                            <SelectValue placeholder="เลือกวิธีการชำระเงิน" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-popover border border-border">
                                        <SelectItem value="Credit Card" className="focus:bg-accent focus:text-accent-foreground">Credit Card</SelectItem>
                                        <SelectItem value="Debit Card" className="focus:bg-accent focus:text-accent-foreground">Debit Card</SelectItem>
                                        <SelectItem value="True Money" className="focus:bg-accent focus:text-accent-foreground">True Money</SelectItem>
                                        <SelectItem value="PayPal" className="focus:bg-accent focus:text-accent-foreground">PayPal</SelectItem>
                                        <SelectItem value="Bank Transfer" className="focus:bg-accent focus:text-accent-foreground">Bank Transfer</SelectItem>
                                        <SelectItem value="Crypto" className="focus:bg-accent focus:text-accent-foreground">Crypto</SelectItem>
                                        <SelectItem value="Other" className="focus:bg-accent focus:text-accent-foreground">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground font-medium">หมายเหตุ</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="หมายเหตุเพิ่มเติม..."
                                        {...field}
                                        className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground resize-none"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange?.(false)}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.formState.isSubmitting}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
                        >
                            {form.formState.isSubmitting && (
                                <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                            )}
                            บันทึก
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    )
}
