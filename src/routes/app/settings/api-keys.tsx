import { createFileRoute } from '@tanstack/react-router'
import { Key } from 'lucide-react'
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

export const Route = createFileRoute('/app/settings/api-keys')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(projectsQueryOptions)
  },
  component: ApiKeysSettings,
})

function ApiKeysSettings() {
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
          <h1 className="text-2xl font-bold mb-2">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for external integrations.
          </p>
        </div>

        <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-blue-500/10 text-blue-500 mb-4">
            <Key className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">API Keys coming soon</h2>
          <p className="text-muted-foreground max-w-sm">
            Generate API keys for programmatic access to Hooki.
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
