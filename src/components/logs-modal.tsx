import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import { ScrollText, ArrowDownToLine, ArrowUpFromLine, X, Loader2, CheckCircle2, XCircle, RotateCcw, RefreshCw, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { rpc } from '@/lib/rpc-client'

interface LogsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    flowId: string
    inboundRoutes: string[]
    outboundRoutes: string[]
}

interface WebhookLog {
    id: string
    flowId: string
    method: string
    path: string
    headers: Record<string, string> | null
    body: string | null
    sourceIp: string | null
    status: 'pending' | 'processing' | 'completed' | 'failed'
    receivedAt: string
    completedAt: string | null
    deliveryAttempts?: Array<{
        id: string
        status: 'pending' | 'success' | 'failed' | 'retrying'
        responseStatus: number | null
        responseBody: string | null
        responseTimeMs: number | null
        destinationUrl: string | null
        errorMessage: string | null
        destination?: {
            name: string
            url: string
        }
    }>
}

interface ReplayStep {
    id: string
    type: 'inbound' | 'hooki' | 'outbound'
    route: string
    status: 'pending' | 'running' | 'success' | 'error'
    duration?: number
    response?: string
    statusCode?: number
}

export function LogsSheet({ open, onOpenChange, flowId, inboundRoutes, outboundRoutes }: LogsSheetProps) {
    const queryClient = useQueryClient()
    const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all')
    const [routeFilter, setRouteFilter] = useState<string>('all')
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)
    const [replayingLogId, setReplayingLogId] = useState<string | null>(null)
    const [replaySteps, setReplaySteps] = useState<ReplayStep[]>([])

    // Fetch logs from database
    const { data: logs = [], isLoading, refetch } = useQuery({
        queryKey: ['logs', flowId],
        queryFn: () => (rpc.logs.list as any)({ flowId, limit: 50 }),
        enabled: open,
        refetchInterval: open ? 5000 : false, // Poll every 5s when open
    })

    // Replay mutation
    const replayMutation = useMutation({
        mutationFn: (logId: string) => (rpc.logs.replay as any)({ id: logId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['logs', flowId] })
        },
    })

    const allRoutes = [...inboundRoutes, ...outboundRoutes]

    // Filter logs (all logs are inbound from the webhook perspective)
    const filteredLogs = (logs as WebhookLog[]).filter((log) => {
        if (routeFilter !== 'all' && log.path !== routeFilter) return false
        return true
    })

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const getStatusColor = (status: WebhookLog['status']) => {
        switch (status) {
            case 'completed': return 'bg-green-500/10 text-green-500'
            case 'failed': return 'bg-red-500/10 text-red-500'
            case 'processing': return 'bg-yellow-500/10 text-yellow-500'
            default: return 'bg-gray-500/10 text-gray-500'
        }
    }

    const runReplay = async (log: WebhookLog) => {
        setReplayingLogId(log.id)
        setSelectedLog(log)

        // Build initial steps for visualization
        const initialSteps: ReplayStep[] = [
            {
                id: 'inbound',
                type: 'inbound' as const,
                route: log.path,
                status: 'success' as const, // Already received
            },
            {
                id: 'hooki',
                type: 'hooki' as const,
                route: 'hooki',
                status: 'running' as const,
            },
            ...outboundRoutes.map((route, i) => ({
                id: `outbound-${i}`,
                type: 'outbound' as const,
                route,
                status: 'pending' as const,
            })),
        ]

        setReplaySteps(initialSteps)

        try {
            // Actually replay via RPC
            await replayMutation.mutateAsync(log.id)

            // Mark all steps as success after replay queued
            setReplaySteps(prev => prev.map(s => ({
                ...s,
                status: 'success' as const,
                statusCode: 200,
            })))
        } catch (error) {
            // Mark hooki step as error
            setReplaySteps(prev => prev.map(s =>
                s.id === 'hooki' ? { ...s, status: 'error' as const } : s
            ))
        }

        setReplayingLogId(null)
    }

    if (!open) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => onOpenChange(false)} />

            <div className="fixed top-0 right-0 h-full w-3/4 bg-card border-l border-border shadow-2xl z-50 flex animate-in slide-in-from-right duration-300">
                {/* Logs List */}
                <div className="flex-1 flex flex-col border-r border-border">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">HTTP Logs</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="p-4 border-b border-border flex gap-4 shrink-0">
                        <div className="flex gap-1">
                            <Button variant={directionFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setDirectionFilter('all')}>All</Button>
                            <Button variant={directionFilter === 'inbound' ? 'default' : 'outline'} size="sm" onClick={() => setDirectionFilter('inbound')} className="gap-1">
                                <ArrowDownToLine className="w-3 h-3" /> Inbound
                            </Button>
                            <Button variant={directionFilter === 'outbound' ? 'default' : 'outline'} size="sm" onClick={() => setDirectionFilter('outbound')} className="gap-1">
                                <ArrowUpFromLine className="w-3 h-3" /> Outbound
                            </Button>
                        </div>

                        <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-1 text-sm">
                            <option value="all">All Routes</option>
                            {allRoutes.map((route) => (<option key={route} value={route}>{route}</option>))}
                        </select>
                    </div>

                    {/* Logs */}
                    <div className="flex-1 overflow-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No logs found. Send a webhook to see activity here.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredLogs.map((log) => (
                                    <div key={log.id}>
                                        <div
                                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                            className={`px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-2 text-xs ${selectedLog?.id === log.id ? 'bg-primary/10' : 'hover:bg-accent/50'
                                                }`}
                                        >
                                            <ArrowDownToLine className="w-3 h-3 text-blue-500 shrink-0" />
                                            <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${getStatusColor(log.status)}`}>
                                                {log.status}
                                            </span>
                                            <span className="font-mono text-muted-foreground">{log.method}</span>
                                            <span className="font-mono text-muted-foreground truncate flex-1">{log.path}</span>
                                            {log.sourceIp && <span className="text-muted-foreground/60 shrink-0">{log.sourceIp}</span>}
                                            <span className="text-muted-foreground/60 shrink-0">{formatTime(log.receivedAt)}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 gap-1 text-[10px]"
                                                onClick={(e) => { e.stopPropagation(); runReplay(log); }}
                                                disabled={replayingLogId !== null}
                                            >
                                                {replayingLogId === log.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />}
                                            </Button>
                                        </div>
                                        {/* Expanded inline details */}
                                        {selectedLog?.id === log.id && (
                                            <div className="ml-5 mt-1 mb-2 p-2 bg-secondary/50 rounded text-xs space-y-2">
                                                <div>
                                                    <span className="text-muted-foreground">Request Body: </span>
                                                    <code className="font-mono">{log.body || '(empty)'}</code>
                                                </div>
                                                {log.deliveryAttempts && log.deliveryAttempts.length > 0 && (
                                                    <div>
                                                        <span className="text-muted-foreground">Deliveries: </span>
                                                        <div className="mt-1 space-y-1">
                                                            {log.deliveryAttempts.map((attempt) => (
                                                                <div key={attempt.id} className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-1 py-0.5 rounded text-[10px] ${attempt.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                            {attempt.responseStatus || attempt.status}
                                                                        </span>
                                                                        <span className="truncate flex-1">{attempt.destinationUrl}</span>
                                                                        {attempt.responseTimeMs && <span className="text-muted-foreground">{attempt.responseTimeMs}ms</span>}
                                                                    </div>
                                                                    {attempt.errorMessage && (
                                                                        <div className="text-red-400 text-[10px] ml-6">Error: {attempt.errorMessage}</div>
                                                                    )}
                                                                    {attempt.responseBody && (
                                                                        <div className="ml-6 text-[10px] bg-secondary/30 p-1 rounded font-mono max-h-20 overflow-auto">
                                                                            {attempt.responseBody.slice(0, 500)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail / Replay Panel */}
                <div className="w-80 flex flex-col shrink-0">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold">{replaySteps.length > 0 ? 'Replay Monitor' : 'Details'}</h3>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {replaySteps.length > 0 ? (
                            <div className="space-y-3">
                                {replaySteps.map((step, idx) => (
                                    <div key={step.id} className="relative">
                                        {idx < replaySteps.length - 1 && <div className="absolute left-4 top-10 w-0.5 h-6 bg-border" />}
                                        <div className={`p-3 rounded-lg border transition-all ${step.status === 'running' ? 'border-primary bg-primary/5 animate-pulse'
                                            : step.status === 'success' ? 'border-green-500/50 bg-green-500/5'
                                                : step.status === 'error' ? 'border-red-500/50 bg-red-500/5'
                                                    : 'border-border'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                                {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                {step.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                                                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                                                <span className="text-sm font-medium capitalize">{step.type}</span>
                                                {step.statusCode && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ml-auto ${step.statusCode < 300 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                        }`}>{step.statusCode}</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-mono text-muted-foreground truncate mt-1">{step.route}</p>
                                            {step.response && <pre className="mt-2 text-xs bg-secondary p-2 rounded">{step.response}</pre>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : selectedLog ? (
                            <div className="space-y-4">
                                {/* Inbound Request Section */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowDownRight className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-semibold text-blue-500">INBOUND REQUEST</span>
                                    </div>
                                    <div className="space-y-3 pl-6 border-l-2 border-blue-500/20">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Path</p>
                                            <code className="text-xs bg-secondary px-2 py-1 rounded">{selectedLog.path}</code>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Body</p>
                                            <pre className="text-xs bg-secondary p-3 rounded overflow-x-auto max-h-32">
                                                {selectedLog.body ? (() => { try { return JSON.stringify(JSON.parse(selectedLog.body), null, 2) } catch { return selectedLog.body } })() : '(empty)'}
                                            </pre>
                                        </div>
                                        {selectedLog.headers && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Headers</p>
                                                <pre className="text-xs bg-secondary p-3 rounded overflow-x-auto max-h-32">
                                                    {JSON.stringify(selectedLog.headers, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Outbound Deliveries Section */}
                                {selectedLog.deliveryAttempts && selectedLog.deliveryAttempts.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <ArrowUpRight className="w-4 h-4 text-orange-500" />
                                            <span className="text-xs font-semibold text-orange-500">OUTBOUND DELIVERIES</span>
                                        </div>
                                        <div className="space-y-3 pl-6 border-l-2 border-orange-500/20">
                                            {selectedLog.deliveryAttempts.map((attempt) => (
                                                <div key={attempt.id} className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${attempt.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {attempt.responseStatus || attempt.status.toUpperCase()}
                                                        </span>
                                                        {attempt.responseTimeMs && <span className="text-xs text-muted-foreground">{attempt.responseTimeMs}ms</span>}
                                                    </div>
                                                    <code className="text-xs text-muted-foreground block truncate">{attempt.destinationUrl}</code>
                                                    {attempt.errorMessage && (
                                                        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                                                            Error: {attempt.errorMessage}
                                                        </div>
                                                    )}
                                                    {attempt.responseBody && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">Response</p>
                                                            <pre className="text-xs bg-secondary p-2 rounded overflow-x-auto max-h-24">
                                                                {(() => { try { return JSON.stringify(JSON.parse(attempt.responseBody), null, 2) } catch { return attempt.responseBody } })().slice(0, 500)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Select a log to view details or replay</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
