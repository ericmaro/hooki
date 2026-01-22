import { useMemo, useRef, useState } from 'react'
import { queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Lock, Save, ScrollText, ShieldCheck, X, Zap } from 'lucide-react'


import { AppLayout } from '../../components/app-layout'
import { FlowEditor } from '../../components/flow-editor'
import { LogsSheet } from '../../components/logs-modal'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '../../components/ui/popover'
import { Switch } from '../../components/ui/switch'
import type { FlowEditorRef } from '../../components/flow-editor';
import { rpc } from '@/lib/rpc-client'

// Query options for projects
const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

// Query options for flow details
const flowQueryOptions = (flowId: string) => queryOptions({
    queryKey: ['flow', flowId],
    queryFn: () => (rpc.flows.get as any)({ id: flowId }),
})

export const Route = createFileRoute('/app/flow/$flowId')({
    loader: async ({ context, params }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(projectsQueryOptions),
            context.queryClient.ensureQueryData(flowQueryOptions(params.flowId))
        ])
    },
    component: FlowEditorPage,
})

function FlowEditorPage() {
    const { flowId } = Route.useParams()
    const router = useRouter()
    const { queryClient } = Route.useRouteContext()
    const [logsOpen, setLogsOpen] = useState(false)
    const [newHeader, setNewHeader] = useState('')
    const editorRef = useRef<FlowEditorRef>(null)

    // Fetch flow data
    const { data: flow } = useSuspenseQuery(flowQueryOptions(flowId))
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)

    // Mutation for saving flow
    const updateFlowMutation = useMutation({
        mutationFn: (data: any) => (rpc.flows.update as any)({ id: flowId, ...data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flow', flowId] })
            router.invalidate()
        }
    })

    const handleSave = () => {
        if (!editorRef.current) return

        const currentData = editorRef.current.getData()
        updateFlowMutation.mutate({
            config: currentData
        })
    }

    // Extract routes from saved config nodes
    const inboundRoutes = useMemo(() => {
        const configNodes = (flow as any).config?.nodes || []
        const inboundNodes = configNodes.filter((n: any) => n.type === 'inbound')
        if (inboundNodes.length > 0) {
            return inboundNodes.map((n: any) => n.data?.path || n.data?.route || '/api/webhooks')
        }
        // Fallback to generated route
        return [`/api/incoming/${flowId}`]
    }, [flow, flowId])

    const outboundRoutes = useMemo(() => {
        const configNodes = (flow as any).config?.nodes || []
        const outboundNodes = configNodes.filter((n: any) => n.type === 'outbound')
        if (outboundNodes.length > 0) {
            return outboundNodes.map((n: any) => n.data?.url || 'https://example.com/webhook')
        }
        // Fallback to destinations table (legacy)
        return (flow as any).destinations?.map((d: any) => d.url) || []
    }, [flow])

    // Sync mode only available for 1:1 mappings
    const isMultiRoute = inboundRoutes.length > 1 || outboundRoutes.length > 1
    const effectiveAsyncMode = isMultiRoute || (flow as any).asyncMode

    return (
        <AppLayout
            projects={projects}
            selectedProjectId={(flow as any).projectId}
            onSelectProject={(_projectId) => {
                router.navigate({ to: '/app' })
            }}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
                    <div className="flex items-center gap-3">
                        <Link to="/app">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <h1 className="font-semibold">{(flow).name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setLogsOpen(true)}>
                            <ScrollText className="w-4 h-4" />
                            Logs & Replay
                        </Button>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/50">
                            <ShieldCheck className={`w-4 h-4 ${(flow as any).requireSignature ? 'text-green-500' : 'text-muted-foreground'}`} />
                            <span className="text-xs text-muted-foreground">Signature</span>
                            <Switch
                                checked={(flow as any).requireSignature ?? true}
                                onCheckedChange={(checked: boolean) => updateFlowMutation.mutate({ requireSignature: checked })}
                                disabled={updateFlowMutation.isPending}
                            />
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/50" title={isMultiRoute ? 'Async mode is required for multi-route flows' : undefined}>
                            <Zap className={`w-4 h-4 ${effectiveAsyncMode ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                            <span className="text-xs text-muted-foreground">Async{isMultiRoute ? ' (auto)' : ''}</span>
                            <Switch
                                checked={effectiveAsyncMode}
                                onCheckedChange={(checked: boolean) => updateFlowMutation.mutate({ asyncMode: checked })}
                                disabled={updateFlowMutation.isPending || isMultiRoute}
                            />
                        </div>
                        {/* Secure Headers Popover */}
                        <Popover>
                            <PopoverTrigger
                                className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer"
                            >
                                <Lock className="w-4 h-4 text-purple-500" />
                                <span className="text-xs text-muted-foreground">
                                    Secure ({((flow as any).secureHeaders as string[] | null)?.length ?? 1})
                                </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <PopoverHeader>
                                    <PopoverTitle>Secure Headers</PopoverTitle>
                                    <PopoverDescription>
                                        Header values that will be masked with *** when stored in logs. Full values are still forwarded to destinations.
                                    </PopoverDescription>
                                </PopoverHeader>
                                <div className="flex flex-wrap gap-1.5">
                                    {(((flow as any).secureHeaders as string[] | null) || ['authorization']).map((header: string) => (
                                        <Badge
                                            key={header}
                                            variant="secondary"
                                            className="gap-1 pr-1"
                                        >
                                            {header}
                                            <button
                                                type="button"
                                                className="ml-1 rounded-full hover:bg-foreground/20 p-0.5"
                                                onClick={() => {
                                                    const currentHeaders = ((flow as any).secureHeaders as string[] | null) || ['authorization']
                                                    const newHeaders = currentHeaders.filter((h: string) => h !== header)
                                                    updateFlowMutation.mutate({ secureHeaders: newHeaders })
                                                }}
                                                disabled={updateFlowMutation.isPending}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <form
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        const trimmed = newHeader.trim().toLowerCase()
                                        if (!trimmed) return
                                        const currentHeaders = ((flow as any).secureHeaders as string[] | null) || ['authorization']
                                        if (currentHeaders.includes(trimmed)) {
                                            setNewHeader('')
                                            return
                                        }
                                        updateFlowMutation.mutate({ secureHeaders: [...currentHeaders, trimmed] })
                                        setNewHeader('')
                                    }}
                                >
                                    <Input
                                        placeholder="Add header name..."
                                        value={newHeader}
                                        onChange={(e) => setNewHeader(e.target.value)}
                                        className="flex-1 h-8 text-xs"
                                    />
                                    <Button type="submit" size="sm" variant="secondary" disabled={updateFlowMutation.isPending || !newHeader.trim()}>
                                        Add
                                    </Button>
                                </form>
                            </PopoverContent>
                        </Popover>
                        <Button
                            size="sm"
                            className="gap-2"
                            onClick={handleSave}
                            disabled={updateFlowMutation.isPending}
                        >
                            <Save className="w-4 h-4" />
                            {updateFlowMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </header>

                {/* Canvas */}
                <div className="flex-1">
                    <FlowEditor
                        ref={editorRef}
                        flowId={flowId}
                        inboundRoutes={inboundRoutes}
                        outboundRoutes={outboundRoutes}
                        initialConfig={(flow).config}
                    />
                </div>
            </div>

            <LogsSheet
                open={logsOpen}
                onOpenChange={setLogsOpen}
                flowId={flowId}
                inboundRoutes={inboundRoutes}
                outboundRoutes={outboundRoutes}
            />
        </AppLayout>
    )
}
