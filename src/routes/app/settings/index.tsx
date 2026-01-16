import { createFileRoute } from '@tanstack/react-router'

// Settings index - shows settings overview
export const Route = createFileRoute('/app/settings/')({
    component: SettingsPage,
})

function SettingsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <p className="text-muted-foreground mb-6">
                Manage your billing, team, and account settings.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
                <a
                    href="/app/settings/billing"
                    className="p-6 rounded-xl border border-border hover:border-primary transition-colors"
                >
                    <h3 className="font-semibold mb-2">Billing</h3>
                    <p className="text-sm text-muted-foreground">Manage subscription and payments</p>
                </a>
                <a
                    href="/app/settings/team"
                    className="p-6 rounded-xl border border-border hover:border-primary transition-colors"
                >
                    <h3 className="font-semibold mb-2">Team</h3>
                    <p className="text-sm text-muted-foreground">Manage team members and permissions</p>
                </a>
            </div>
        </div>
    )
}
