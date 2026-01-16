import { createFileRoute } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter } from '@tanstack/react-router'

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

export const Route = createFileRoute('/app/settings/security')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: SecuritySettings,
})

function SecuritySettings() {
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
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Security</h1>
                    <p className="text-muted-foreground">
                        Update your password and manage active sessions.
                    </p>
                </div>

                <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Security Settings coming soon</h2>
                    <p className="text-muted-foreground max-w-sm">
                        Enhanced security features like basic MFA and session management are on the way.
                    </p>
                </div>
            </div>
        </AppLayout>
    )
}
