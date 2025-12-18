import { SubscriptionManager } from "./components/subscription-manager"

export default function SubscriptionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
            </div>
            <SubscriptionManager />
        </div>
    )
}
