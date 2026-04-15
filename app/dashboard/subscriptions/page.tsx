import { SubscriptionManager } from "./components/subscription-manager"

export default function SubscriptionsPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-spotify-title">Subscriptions</h1>
                <p className="text-spotify-muted mt-2">Manage your active and past service subscriptions.</p>
            </div>
            <SubscriptionManager />
        </div>
    )
}
