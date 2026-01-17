import { useMemo, useState } from 'react'
import { queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'

import { AppLayout } from '@/components/app-layout'
import { EmptyState } from '@/components/empty-state'
import { FlowCard } from '@/components/flow-card'
import { FlowModal } from '@/components/flow-modal'
import { ProjectModal } from '@/components/project-modal'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { rpc } from '@/lib/rpc-client'

// Query options for projects
const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

// Query options for flows
const flowsQueryOptions = (projectId: string) => queryOptions({
    queryKey: ['flows', projectId],
    queryFn: () => (rpc.flows.list as any)({ projectId }),
})

export const Route = createFileRoute('/app/project/$projectId')({
    loader: async ({ context, params }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
        await context.queryClient.ensureQueryData(flowsQueryOptions(params.projectId))
    },
    component: ProjectPage,
})

function ProjectPage() {
    const router = useRouter()
    const { queryClient } = Route.useRouteContext()
    const { projectId } = Route.useParams()

    // Query projects and flows
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)
    const { data: flows = [] } = useSuspenseQuery(flowsQueryOptions(projectId))

    const [flowModalOpen, setFlowModalOpen] = useState(false)
    const [projectModalOpen, setProjectModalOpen] = useState(false)
    const [editingFlowId, setEditingFlowId] = useState<string | null>(null)
    const [deletingFlowId, setDeletingFlowId] = useState<string | null>(null)

    const selectedProject = useMemo(
        () => projects.find((p: any) => p.id === projectId),
        [projects, projectId]
    )

    // Handle project selection - navigate to project route
    const handleSelectProject = (newProjectId: string) => {
        router.navigate({ to: '/app/project/$projectId', params: { projectId: newProjectId } })
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

    const createFlowMutation = useMutation({
        mutationFn: (data: {
            projectId: string
            name: string
            description?: string
            config?: any
        }) => (rpc.flows.create as any)(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] })
            setFlowModalOpen(false)
        },
    })

    const deleteFlowMutation = useMutation({
        mutationFn: (id: string) => (rpc.flows.delete as any)({ id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] })
        },
    })

    const updateFlowMutation = useMutation({
        mutationFn: (data: { id: string; name: string; config: any }) =>
            (rpc.flows.update as any)(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] })
            setEditingFlowId(null)
        },
    })

    const handleCreateProject = (data: { name: string }) => {
        createProjectMutation.mutate(data)
    }

    const handleDeleteFlow = (id: string) => {
        setDeletingFlowId(id)
    }

    const confirmDeleteFlow = () => {
        if (deletingFlowId) {
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

        // Add central hooki node
        const maxCount = Math.max(data.inboundRoutes.length, data.outboundRoutes.length, 1)
        const centerY = 100 + ((maxCount - 1) * 150) / 2
        nodes.push({
            id: 'hooki',
            type: 'hooki',
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

        // Connect all inbound nodes to hooki
        data.inboundRoutes.forEach((_, i) => {
            edges.push({
                id: `e-inbound-${i}-hooki`,
                source: `inbound-${i}`,
                target: 'hooki',
            })
        })

        // Connect hooki to all outbound nodes
        data.outboundRoutes.forEach((_, i) => {
            edges.push({
                id: `e-hooki-outbound-${i}`,
                source: 'hooki',
                target: `outbound-${i}`,
            })
        })

        const config = nodes.length > 0 ? { nodes, edges } : null

        createFlowMutation.mutate({
            projectId,
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

        // Rebuild config from modal data
        const nodes: Array<any> = []
        const edges: Array<any> = []

        data.inboundRoutes.forEach((path, i) => {
            nodes.push({
                id: `inbound-${i}`,
                type: 'inbound',
                position: { x: 50, y: 100 + i * 150 },
                data: { path: path.trim() },
            })
        })

        const maxCount = Math.max(data.inboundRoutes.length, data.outboundRoutes.length, 1)
        const centerY = 100 + ((maxCount - 1) * 150) / 2
        nodes.push({
            id: 'hooki',
            type: 'hooki',
            position: { x: 350, y: centerY },
            data: {},
        })

        data.outboundRoutes.forEach((url, i) => {
            const trimmedUrl = url.trim()
            nodes.push({
                id: `outbound-${i}`,
                type: 'outbound',
                position: { x: 650, y: 100 + i * 150 },
                data: { url: trimmedUrl, label: trimmedUrl },
            })
        })

        data.inboundRoutes.forEach((_, i) => {
            edges.push({
                id: `e-inbound-${i}-hooki`,
                source: `inbound-${i}`,
                target: 'hooki',
            })
        })

        data.outboundRoutes.forEach((_, i) => {
            edges.push({
                id: `e-hooki-outbound-${i}`,
                source: 'hooki',
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

    // Project not found
    if (!selectedProject) {
        return (
            <AppLayout
                projects={projects}
                onSelectProject={handleSelectProject}
                onCreateProject={() => setProjectModalOpen(true)}
            >
                <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Project not found</p>
                </div>
                <ProjectModal
                    open={projectModalOpen}
                    onOpenChange={setProjectModalOpen}
                    onSubmit={handleCreateProject}
                />
            </AppLayout>
        )
    }

    return (
        <AppLayout
            projects={projects}
            selectedProjectId={projectId}
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
