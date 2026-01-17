import { createFileRoute } from '@tanstack/react-router'
import { User } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter } from '@tanstack/react-router'
import { useProjectModal } from '@/hooks/use-project-modal'
import { ProjectModal } from '@/components/project-modal'

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

export const Route = createFileRoute('/app/settings/profile')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: ProfileSettings,
})

function ProfileSettings() {
    const router = useRouter()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)
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
                    <h1 className="text-2xl font-bold mb-2">Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your personal information and avatar.
                    </p>
                </div>

                <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                        <User className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Profile Settings coming soon</h2>
                    <p className="text-muted-foreground max-w-sm">
                        We're working on making your profile more customizable. Check back soon!
                    </p>
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
