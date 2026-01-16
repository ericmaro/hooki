import { createFileRoute } from '@tanstack/react-router'
import { Palette } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter } from '@tanstack/react-router'

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

export const Route = createFileRoute('/app/settings/appearance')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: AppearanceSettings,
})

function AppearanceSettings() {
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
                    <h1 className="text-2xl font-bold mb-2">Appearance</h1>
                    <p className="text-muted-foreground">
                        Customize the look and feel of your dashboard.
                    </p>
                </div>

                <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-purple-500/10 text-purple-500 mb-4">
                        <Palette className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Appearance Settings coming soon</h2>
                    <p className="text-muted-foreground max-w-sm">
                        Dark mode and high-contrast themes will be available soon.
                    </p>
                </div>
            </div>
        </AppLayout>
    )
}
