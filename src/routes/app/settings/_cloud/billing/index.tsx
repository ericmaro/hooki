import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter, createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/app-layout'

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

// Billing page - Stripe integration (Cloud only)
export const Route = createFileRoute('/app/settings/_cloud/billing/')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: BillingPage,
})

function BillingPage() {
    const router = useRouter()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)

    return (
        <AppLayout
            projects={projects}
            onSelectProject={(_projectId) => {
                router.navigate({ to: '/app' })
            }}
        >
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Billing</h1>
                <p className="text-muted-foreground mb-6">
                    Manage your subscription and payment methods.
                </p>

                {/* Current Plan */}
                <div className="rounded-xl border border-border p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Current Plan</h3>
                            <p className="text-sm text-muted-foreground">Free</p>
                        </div>
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">
                            Upgrade
                        </button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <p>3 flows • 10,000 requests/month • 7 day log retention</p>
                    </div>
                </div>

                {/* TODO: Stripe checkout integration */}
            </div>
        </AppLayout>
    )
}
