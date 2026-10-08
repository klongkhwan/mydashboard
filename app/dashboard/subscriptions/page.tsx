import { PageHeader } from "@/components/ui/page-header"
import { SubscriptionManager } from "./components/subscription-manager"

export default function SubscriptionsPage() {
    return (
        <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-8">
            <PageHeader
                eyebrow="Billing & Services"
                title="Subscriptions"
                description="Manage your active and past service subscriptions in one place."
            />
            <SubscriptionManager />
        </div>
    )
}

