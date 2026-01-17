import { createFileRoute } from '@tanstack/react-router'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter } from '@tanstack/react-router'
import { useTheme } from '@/components/theme-provider'
import { useProjectModal } from '@/hooks/use-project-modal'
import { ProjectModal } from '@/components/project-modal'
import { cn } from '@/lib/utils'

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

const themes = [
    {
        id: 'light' as const,
        name: 'Light',
        description: 'A clean, bright appearance',
        icon: Sun,
    },
    {
        id: 'dark' as const,
        name: 'Dark',
        description: 'Easy on the eyes in low light',
        icon: Moon,
    },
    {
        id: 'system' as const,
        name: 'System',
        description: 'Matches your device settings',
        icon: Monitor,
    },
]

function AppearanceSettings() {
    const router = useRouter()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)
    const { theme, setTheme } = useTheme()
    const { projectModalOpen, setProjectModalOpen, openProjectModal, handleCreateProject } = useProjectModal()

    return (
        <AppLayout
            projects={projects}
            onSelectProject={(projectId) => {
                router.navigate({ to: '/app/project/$projectId', params: { projectId } })
            }}
            onCreateProject={openProjectModal}
        >
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Appearance</h1>
                    <p className="text-muted-foreground">
                        Customize the look and feel of your dashboard.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-1">Theme</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select your preferred color scheme
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {themes.map((t) => {
                                const Icon = t.icon
                                const isSelected = theme === t.id

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={cn(
                                            'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
                                            'hover:border-primary/50 hover:bg-accent/50',
                                            isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border bg-card'
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 p-1 rounded-full bg-primary text-primary-foreground">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                'p-3 rounded-xl transition-colors',
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <div className="font-medium">{t.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {t.description}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Preview section */}
                    <div className="mt-8 p-6 rounded-xl border border-border bg-card">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">
                            Preview
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex-1 p-4 rounded-lg bg-background border border-border">
                                <div className="h-2 w-16 rounded bg-primary mb-2" />
                                <div className="h-2 w-24 rounded bg-muted" />
                            </div>
                            <div className="flex-1 p-4 rounded-lg bg-muted">
                                <div className="h-2 w-20 rounded bg-foreground/20 mb-2" />
                                <div className="h-2 w-16 rounded bg-foreground/10" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ProjectModal
                open={projectModalOpen}
                onOpenChange={setProjectModalOpen}
                onSubmit={handleCreateProject}
            />
        </AppLayout>
    )
}
