import { useState } from 'react'
import { queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { FolderOpen, Plus, ArrowRight } from 'lucide-react'

import { AppLayout } from '../../components/app-layout'
import { EmptyState } from '../../components/empty-state'
import { ProjectModal } from '../../components/project-modal'
import { Button } from '../../components/ui/button'
import { rpc } from '@/lib/rpc-client'

// Query options for projects
const projectsQueryOptions = queryOptions({
  queryKey: ['projects'],
  queryFn: () => (rpc.projects.list as any)({}),
})

export const Route = createFileRoute('/app/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(projectsQueryOptions)
  },
  component: Home,
})

function Home() {
  const router = useRouter()
  const { queryClient } = Route.useRouteContext()

  // Query projects (prefetched in loader)
  const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)

  const [projectModalOpen, setProjectModalOpen] = useState(false)

  // Handle project selection - navigate to project route
  const handleSelectProject = (projectId: string) => {
    router.navigate({ to: '/app/project/$projectId', params: { projectId } })
  }

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      (rpc.projects.create as any)(data),
    onSuccess: (newProject: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setProjectModalOpen(false)
      router.navigate({ to: '/app/project/$projectId', params: { projectId: newProject.id } })
    },
  })

  const handleCreateProject = (data: { name: string }) => {
    createProjectMutation.mutate(data)
  }

  // No projects yet - show create project empty state
  if (projects.length === 0) {
    return (
      <AppLayout
        projects={projects}
        onCreateProject={() => setProjectModalOpen(true)}
      >
        <EmptyState type="project" onCreateProject={() => setProjectModalOpen(true)} />
        <ProjectModal
          open={projectModalOpen}
          onOpenChange={setProjectModalOpen}
          onSubmit={handleCreateProject}
        />
      </AppLayout>
    )
  }

  // Show all projects grid
  return (
    <AppLayout
      projects={projects}
      onSelectProject={handleSelectProject}
      onCreateProject={() => setProjectModalOpen(true)}
    >
      <div className="h-full flex flex-col">
        <header className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">All Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => setProjectModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </header>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => (
              <Link
                key={project.id}
                to="/app/project/$projectId"
                params={{ projectId: project.id }}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {project.description || 'No description'}
                </p>
                {project.createdAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
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