import { useState } from 'react'
import { Button } from './ui/button'
import { Play, Loader2, CheckCircle2, XCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

interface ReplayStep {
    id: string
    type: 'inbound' | 'hooki' | 'outbound'
    route: string
    status: 'pending' | 'running' | 'success' | 'error'
    duration?: number
    response?: string
    statusCode?: number
}

interface ReplaySidebarProps {
    open: boolean
    onClose: () => void
    inboundRoutes: string[]
    outboundRoutes: string[]
}

export function ReplaySidebar({ open, onClose, inboundRoutes, outboundRoutes }: ReplaySidebarProps) {
    const [isReplaying, setIsReplaying] = useState(false)
    const [requestBody, setRequestBody] = useState('{\n  "event": "test",\n  "data": {}\n}')
    const [steps, setSteps] = useState<ReplayStep[]>([])

    const runReplay = async () => {
        setIsReplaying(true)

        // Build initial steps
        const initialSteps: ReplayStep[] = [
            ...inboundRoutes.map((route, i) => ({
                id: `inbound-${i}`,
                type: 'inbound' as const,
                route,
                status: 'pending' as const,
            })),
            {
                id: 'hooki',
                type: 'hooki' as const,
                route: 'hooki',
                status: 'pending' as const,
            },
            ...outboundRoutes.map((route, i) => ({
                id: `outbound-${i}`,
                type: 'outbound' as const,
                route,
                status: 'pending' as const,
            })),
        ]

        setSteps(initialSteps)

        // Simulate step-by-step execution
        for (let i = 0; i < initialSteps.length; i++) {
            // Set current step to running
            setSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: 'running' as const } : s
            ))

            // Simulate network delay
            await new Promise(r => setTimeout(r, 500 + Math.random() * 1000))

            // Randomly succeed or fail (90% success rate)
            const success = Math.random() > 0.1
            const duration = Math.floor(50 + Math.random() * 200)

            setSteps(prev => prev.map((s, idx) =>
                idx === i ? {
                    ...s,
                    status: success ? 'success' as const : 'error' as const,
                    duration,
                    statusCode: success ? 200 : 500,
                    response: success
                        ? JSON.stringify({ success: true, received: true }, null, 2)
                        : JSON.stringify({ error: 'Connection timeout' }, null, 2),
                } : s
            ))

            // Stop on error
            if (!success) break
        }

        setIsReplaying(false)
    }

    if (!open) return null

    return (
        <div className="w-80 h-full bg-card border-l border-border flex flex-col shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Replay & Monitor</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
                </div>
                <Button
                    className="w-full gap-2"
                    onClick={runReplay}
                    disabled={isReplaying}
                >
                    {isReplaying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    {isReplaying ? 'Running...' : 'Run Replay'}
                </Button>
            </div>

            {/* Request Body */}
            <div className="p-4 border-b border-border">
                <label className="text-xs text-muted-foreground mb-2 block">Request Body</label>
                <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-24 bg-secondary border border-border rounded-md p-2 text-xs font-mono resize-none"
                    placeholder="JSON request body..."
                />
            </div>

            {/* Live Steps */}
            <div className="flex-1 overflow-auto p-4">
                <label className="text-xs text-muted-foreground mb-3 block">Execution Flow</label>

                {steps.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Click "Run Replay" to start
                    </p>
                ) : (
                    <div className="space-y-3">
                        {steps.map((step, idx) => (
                            <div key={step.id} className="relative">
                                {/* Connection line */}
                                {idx < steps.length - 1 && (
                                    <div className="absolute left-4 top-10 w-0.5 h-6 bg-border" />
                                )}

                                <div className={`p-3 rounded-lg border transition-all ${step.status === 'running'
                                        ? 'border-primary bg-primary/5 animate-pulse'
                                        : step.status === 'success'
                                            ? 'border-green-500/50 bg-green-500/5'
                                            : step.status === 'error'
                                                ? 'border-red-500/50 bg-red-500/5'
                                                : 'border-border'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                        {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {step.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                                        {step.status === 'pending' && (
                                            step.type === 'inbound' ? <ArrowDownToLine className="w-4 h-4 text-muted-foreground" /> :
                                                step.type === 'outbound' ? <ArrowUpFromLine className="w-4 h-4 text-muted-foreground" /> :
                                                    <div className="w-4 h-4 rounded bg-muted-foreground/30" />
                                        )}
                                        <span className="text-sm font-medium capitalize">{step.type}</span>
                                        {step.statusCode && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${step.statusCode >= 200 && step.statusCode < 300
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {step.statusCode}
                                            </span>
                                        )}
                                        {step.duration && (
                                            <span className="text-xs text-muted-foreground ml-auto">{step.duration}ms</span>
                                        )}
                                    </div>
                                    <p className="text-xs font-mono text-muted-foreground truncate">{step.route}</p>

                                    {/* Response preview */}
                                    {step.response && (
                                        <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-x-auto max-h-20">
                                            {step.response}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
