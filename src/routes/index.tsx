import { useMemo, useState } from 'react'
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { Plus, Trash2 } from 'lucide-react'


import { AppLayout } from '../components/app-layout'
import { EmptyState } from '../components/empty-state'
import { FlowCard } from '../components/flow-card'
import { FlowModal } from '../components/flow-modal'
import { ProjectModal } from '../components/project-modal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { rpc } from '@/lib/rpc-client'
import { auth } from '@/lib/auth'

// Keep getSession as server fn for beforeLoad authentication check
const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  return session
})

// Query options for projects
const projectsQueryOptions = queryOptions({
  queryKey: ['projects'],
  queryFn: () => (rpc.projects.list as any)({}),
})

// Query options for flows
const flowsQueryOptions = (projectId: string | null) => queryOptions({
  queryKey: ['flows', projectId],
  queryFn: () => (rpc.flows.list as any)({ projectId }),
  enabled: !!projectId,
})

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session?.user) {
      throw redirect({ to: '/login' })
    }
  },
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

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  )
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null)
  const [deletingFlowId, setDeletingFlowId] = useState<string | null>(null)

  // Query flows
  const { data: flows = [] } = useQuery(flowsQueryOptions(selectedProjectId))

  // Handle project selection
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
  }

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      (rpc.projects.create as any)(data),
    onSuccess: (newProject: any) => {
      console.log('Project created successfully:', newProject)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSelectedProjectId(newProject.id)
      setProjectModalOpen(false)
      router.invalidate()
    },
    onError: (error) => {
      console.error('Project creation failed:', error)
    },
  })

  const createFlowMutation = useMutation({
    mutationFn: (data: {
      projectId: string
      name: string
      description?: string
      config?: any
    }) => (rpc.flows.create as any)(data),
    onSuccess: (newFlow: any) => {
      console.log('Flow created successfully:', newFlow)
      queryClient.invalidateQueries({ queryKey: ['flows', selectedProjectId] })
      setFlowModalOpen(false)
      router.invalidate()
    },
    onError: (error) => {
      console.error('Flow creation failed:', error)
    },
  })

  const deleteFlowMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('Calling rpc.flows.delete with id:', id)
      return (rpc.flows.delete as any)({ id })
    },
    onSuccess: () => {
      console.log('Flow deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['flows', selectedProjectId] })
      router.invalidate()
    },
    onError: (error) => {
      console.error('Flow deletion failed:', error)
    },
  })

  const updateFlowMutation = useMutation({
    mutationFn: (data: { id: string; name: string; config: any }) => (rpc.flows.update as any)(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows', selectedProjectId] })
      setEditingFlowId(null)
      router.invalidate()
    },
    onError: (error) => {
      console.error('Flow update failed:', error)
    },
  })

  const handleCreateProject = (data: { name: string }) => {
    createProjectMutation.mutate(data)
  }

  const handleDeleteFlow = (id: string) => {
    console.log('Delete flow clicked for id:', id)
    setDeletingFlowId(id)
  }

  const confirmDeleteFlow = () => {
    if (deletingFlowId) {
      console.log('Deletion confirmed, calling mutation...')
      deleteFlowMutation.mutate(deletingFlowId)
      setDeletingFlowId(null)
    }
  }

  const handleEditFlow = (id: string) => {
    setEditingFlowId(id)
  }

  const handleCreateFlow = (data: {
    name: string
    inboundRoutes: Array<string>
    outboundRoutes: Array<string>
  }) => {
    if (!selectedProjectId) {
      console.error('Cannot create flow: no project selected')
      return
    }

    console.log('Creating flow with data:', data)

    // Generate initial canvas configuration from modal data
    const nodes: Array<any> = []
    const edges: Array<any> = []

    // Add inbound nodes on the left
    data.inboundRoutes.forEach((path, i) => {
      nodes.push({
        id: `inbound-${i}`,
        type: 'inbound',
        position: { x: 50, y: 100 + i * 150 },
        data: { path: path.trim() },
      })
    })

    // Add central hookio node
    const maxCount = Math.max(data.inboundRoutes.length, data.outboundRoutes.length, 1)
    const centerY = 100 + ((maxCount - 1) * 150) / 2
    nodes.push({
      id: 'hookio',
      type: 'hookio',
      position: { x: 350, y: centerY },
      data: {},
    })

    // Add outbound nodes on the right
    data.outboundRoutes.forEach((url, i) => {
      const trimmedUrl = url.trim()
      nodes.push({
        id: `outbound-${i}`,
        type: 'outbound',
        position: { x: 650, y: 100 + i * 150 },
        data: { url: trimmedUrl, label: trimmedUrl },
      })
    })

    // Connect all inbound nodes to hookio
    data.inboundRoutes.forEach((_, i) => {
      edges.push({
        id: `e-inbound-${i}-hookio`,
        source: `inbound-${i}`,
        target: 'hookio',
      })
    })

    // Connect hookio to all outbound nodes
    data.outboundRoutes.forEach((_, i) => {
      edges.push({
        id: `e-hookio-outbound-${i}`,
        source: 'hookio',
        target: `outbound-${i}`,
      })
    })

    // Only include config if we have nodes, otherwise let the editor create them later
    const config = nodes.length > 0 ? { nodes, edges } : null

    createFlowMutation.mutate({
      projectId: selectedProjectId,
      name: data.name,
      description: `Flow for ${data.name}`,
      config,
    })
  }

  const handleUpdateFlow = (data: {
    name: string
    inboundRoutes: Array<string>
    outboundRoutes: Array<string>
  }) => {
    if (!editingFlowId) return
    const flow = flows.find((f: any) => f.id === editingFlowId)
    if (!flow) return

    console.log('Updating flow with data:', data)

    // Rebuild config from modal data, including hookio node
    const nodes: Array<any> = []
    const edges: Array<any> = []

    // Add inbound nodes on the left
    data.inboundRoutes.forEach((path, i) => {
      nodes.push({
        id: `inbound-${i}`,
        type: 'inbound',
        position: { x: 50, y: 100 + i * 150 },
        data: { path: path.trim() },
      })
    })

    // Add central hookio node
    const maxCount = Math.max(data.inboundRoutes.length, data.outboundRoutes.length, 1)
    const centerY = 100 + ((maxCount - 1) * 150) / 2
    nodes.push({
      id: 'hookio',
      type: 'hookio',
      position: { x: 350, y: centerY },
      data: {},
    })

    // Add outbound nodes on the right
    data.outboundRoutes.forEach((url, i) => {
      const trimmedUrl = url.trim()
      nodes.push({
        id: `outbound-${i}`,
        type: 'outbound',
        position: { x: 650, y: 100 + i * 150 },
        data: { url: trimmedUrl, label: trimmedUrl },
      })
    })

    // Connect all inbound nodes to hookio
    data.inboundRoutes.forEach((_, i) => {
      edges.push({
        id: `e-inbound-${i}-hookio`,
        source: `inbound-${i}`,
        target: 'hookio',
      })
    })

    // Connect hookio to all outbound nodes
    data.outboundRoutes.forEach((_, i) => {
      edges.push({
        id: `e-hookio-outbound-${i}`,
        source: 'hookio',
        target: `outbound-${i}`,
      })
    })

    const config = nodes.length > 0 ? { nodes, edges } : null

    updateFlowMutation.mutate({
      id: editingFlowId,
      name: data.name,
      config,
    })
  }

  const selectedProject = useMemo(() => projects.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId])

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

  // No project selected - prompt to select
  if (!selectedProject) {
    return (
      <AppLayout
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setProjectModalOpen(true)}
      >
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Select a project from the sidebar</p>
        </div>
        <ProjectModal
          open={projectModalOpen}
          onOpenChange={setProjectModalOpen}
          onSubmit={handleCreateProject}
        />
      </AppLayout>
    )
  }

  // Project selected - show flows
  return (
    <AppLayout
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={handleSelectProject}
      onCreateProject={() => setProjectModalOpen(true)}
    >
      {flows.length === 0 ? (
        <div className="h-full flex flex-col">
          <header className="p-6 border-b border-border">
            <h1 className="text-xl font-semibold">{selectedProject.name}</h1>
          </header>
          <div className="flex-1">
            <EmptyState type="flow" onCreateFlow={() => setFlowModalOpen(true)} />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <header className="p-6 border-b border-border flex items-center justify-between">
            <h1 className="text-xl font-semibold">{selectedProject.name}</h1>
            <Button size="sm" onClick={() => setFlowModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Flow
            </Button>
          </header>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flows.map((flow: any) => {
                const inboundRoutes = flow.config?.nodes
                  ?.filter((node: any) => node.type === 'inbound')
                  ?.map((node: any) => node.data?.path || node.data?.route || '/api/webhooks') || []

                const outboundRoutes = flow.config?.nodes
                  ?.filter((node: any) => node.type === 'outbound')
                  ?.map((node: any) => node.data?.label || node.data?.url || 'Dest') ||
                  flow.destinations?.map((d: any) => d.name) || []

                return (
                  <FlowCard
                    key={flow.id}
                    id={flow.id}
                    name={flow.name}
                    inboundRoutes={inboundRoutes}
                    outboundRoutes={outboundRoutes}
                    onDelete={handleDeleteFlow}
                    onEdit={handleEditFlow}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      <FlowModal
        open={flowModalOpen || !!editingFlowId}
        onOpenChange={(open) => {
          if (!open) {
            setFlowModalOpen(false)
            setEditingFlowId(null)
          }
        }}
        initialData={
          editingFlowId
            ? (() => {
              const flow = flows.find((f: any) => f.id === editingFlowId)
              if (!flow) return undefined
              return {
                name: flow.name,
                inboundRoutes:
                  flow.config?.nodes
                    ?.filter((node: any) => node.type === 'inbound')
                    ?.map((node: any) => node.data?.path || node.data?.route || '/api/webhooks') || [],
                outboundRoutes:
                  flow.config?.nodes
                    ?.filter((node: any) => node.type === 'outbound')
                    ?.map((node: any) => node.data?.label || node.data?.url || 'Dest') ||
                  flow.destinations?.map((d: any) => d.name) || [],
              }
            })()
            : undefined
        }
        onSubmit={editingFlowId ? handleUpdateFlow : handleCreateFlow}
      />

      <ProjectModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        onSubmit={handleCreateProject}
      />

      {/* Delete Flow Confirmation Dialog */}
      <AlertDialog open={!!deletingFlowId} onOpenChange={(open) => !open && setDeletingFlowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flow? This action cannot be undone.
              All associated logs and configurations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteFlow}
            >
              Delete Flow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}