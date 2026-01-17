import { createFileRoute } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
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

export const Route = createFileRoute('/app/settings/notifications')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(projectsQueryOptions)
  },
  component: NotificationsSettings,
})

function NotificationsSettings() {
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
          <h1 className="text-2xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Configure webhook failure alerts and notifications.
          </p>
        </div>

        <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-orange-500/10 text-orange-500 mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Notifications coming soon</h2>
          <p className="text-muted-foreground max-w-sm">
            Get alerted when webhooks fail or when important events occur.
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
