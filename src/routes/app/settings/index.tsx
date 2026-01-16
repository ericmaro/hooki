import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { Settings, CreditCard, Users, Key, Bell, LogOut, User, Shield, Palette, Building2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { auth } from '@/lib/auth'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/app-layout'
import { rpc } from '@/lib/rpc-client'

// Query options for projects
const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})


// Auth check for settings route
const getSession = createServerFn({ method: 'GET' }).handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
        headers: request.headers,
    })
    return session
})

// Settings index - shows settings overview
export const Route = createFileRoute('/app/settings/')({
    beforeLoad: async () => {
        const session = await getSession()
        if (!session?.user) {
            throw redirect({ to: '/login' })
        }
    },
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: SettingsPage,
})

function SettingsPage() {
    const router = useRouter()
    const { isCloud } = Route.useRouteContext()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)

    return (
        <AppLayout
            projects={projects}
            onSelectProject={(_projectId) => {
                router.navigate({ to: '/app' })
            }}
        >
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Settings</h1>
                        <p className="text-muted-foreground">
                            Manage your account and application settings.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                        onClick={async () => {
                            await signOut()
                            window.location.href = '/login'
                        }}
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </div>

                <div className="grid gap-6">
                    {/* Account & Profile */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Account</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Link
                                to="/app/settings/profile"
                                className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">Profile</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Manage your personal information and avatar
                                    </p>
                                </div>
                            </Link>

                            <Link
                                to="/app/settings/security"
                                className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">Security</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Update your password and manage active sessions
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </section>

                    {/* API & Notifications */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Integrations</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Link
                                to="/app/settings/api-keys"
                                className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                            <Key className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">API Keys</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Manage API keys for external integrations
                                    </p>
                                </div>
                            </Link>

                            <Link
                                to="/app/settings/notifications"
                                className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">Notifications</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Configure webhook failure alerts and notifications
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Preferences</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Link
                                to="/app/settings/appearance"
                                className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                            <Palette className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">Appearance</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Customize the look and feel of your dashboard
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </section>

                    {/* Cloud-only settings */}
                    {isCloud && (
                        <>
                            <section>
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Organization</h2>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Link
                                        to="/app/settings/organization"
                                        className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold group-hover:text-primary transition-colors">General</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Manage organization name, slug and branding
                                            </p>
                                        </div>
                                    </Link>

                                    <Link
                                        to="/app/settings/team"
                                        className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold group-hover:text-primary transition-colors">Members</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Manage team members and permissions
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Billing</h2>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Link
                                        to="/app/settings/billing"
                                        className="p-6 rounded-xl border border-border hover:border-primary transition-colors group flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold group-hover:text-primary transition-colors">Subscription</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Manage plan, billing and payment methods
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* Self-hosted info */}
                {!isCloud && (
                    <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-border flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">Self-hosted Mode</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                You're running Hooki in self-hosted mode. This version provides full control over your data.
                                For managed hosting, team features, and priority support, check out
                                <a href="https://hooki.cloud" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 font-medium">Hooki Cloud</a>.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
