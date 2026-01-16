import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import {
    Background,
    Controls,
    Handle,
    MarkerType,
    Panel,
    Position,
    ReactFlow,
    addEdge,
    useEdgesState,
    useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus } from 'lucide-react'
import { InboundNode } from './nodes/inbound-node'
import { OutboundNode } from './nodes/outbound-node'
import { Button } from './ui/button'

import type {
    Connection,
    Edge,
    Node,
    NodeTypes
} from '@xyflow/react'

export interface FlowData {
    nodes: Array<{
        id: string
        type: string
        position: { x: number; y: number }
        data: Record<string, any>
    }>
    edges: Array<{
        id: string
        source: string
        target: string
    }>
}

interface FlowEditorProps {
    flowId: string
    inboundRoutes?: Array<string>
    outboundRoutes?: Array<string>
    initialConfig?: FlowData | null
}

export interface FlowEditorRef {
    getData: () => FlowData
}

// Central Hookio node
function HookioNode() {
    return (
        <div className="bg-primary text-primary-foreground rounded-xl px-6 py-4 min-w-[120px] shadow-lg text-center">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary"
            />
            <span className="font-semibold">hookio</span>
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary"
            />
        </div>
    )
}

export const FlowEditor = forwardRef<FlowEditorRef, FlowEditorProps>(
    ({ inboundRoutes: initialInbound = [], outboundRoutes: initialOutbound = [], initialConfig }, ref) => {
        const [inboundCount, setInboundCount] = useState(Math.max(initialInbound.length, 1))
        const [outboundCount, setOutboundCount] = useState(Math.max(initialOutbound.length, 1))

        const nodeTypes: NodeTypes = useMemo(
            () => ({
                inbound: InboundNode,
                outbound: OutboundNode,
                hookio: HookioNode,
            }),
            []
        )

        const buildNodes = useCallback(() => {
            if (initialConfig?.nodes && initialConfig.nodes.length > 0) {
                return initialConfig.nodes as Array<Node>
            }

            const nodes: Array<Node> = []

            // Add inbound nodes on the left
            for (let i = 0; i < inboundCount; i++) {
                nodes.push({
                    id: `inbound-${i + 1}`,
                    type: 'inbound',
                    position: { x: 50, y: 80 + i * 100 },
                    data: { route: initialInbound[i] || '/api/webhooks' },
                })
            }

            // Add central hookio node
            const maxCount = Math.max(inboundCount, outboundCount)
            const centerY = 80 + ((maxCount - 1) * 100) / 2
            nodes.push({
                id: 'hookio',
                type: 'hookio',
                position: { x: 350, y: centerY },
                data: {},
            })

            // Add outbound nodes on the right
            for (let i = 0; i < outboundCount; i++) {
                nodes.push({
                    id: `outbound-${i + 1}`,
                    type: 'outbound',
                    position: { x: 650, y: 80 + i * 100 },
                    data: { url: initialOutbound[i] || 'https://example.com/webhook' },
                })
            }

            return nodes
        }, [inboundCount, outboundCount, initialInbound, initialOutbound, initialConfig])

        const buildEdges = useCallback(() => {
            if (initialConfig?.edges && initialConfig.edges.length > 0) {
                // Apply animation and markers to loaded edges
                return initialConfig.edges.map(edge => ({
                    ...edge,
                    animated: true,
                    style: { stroke: 'var(--primary)', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: 'var(--primary)',
                        width: 20,
                        height: 20,
                    },
                })) as Array<Edge>
            }

            const edges: Array<Edge> = []
            const edgeStyle = { stroke: 'var(--primary)', strokeWidth: 2 }
            const markerEnd = {
                type: MarkerType.ArrowClosed,
                color: 'var(--primary)',
                width: 20,
                height: 20,
            }

            // Connect all inbound nodes to hookio
            for (let i = 0; i < inboundCount; i++) {
                edges.push({
                    id: `e-inbound-${i + 1}-hookio`,
                    source: `inbound-${i + 1}`,
                    target: 'hookio',
                    animated: true,
                    style: edgeStyle,
                    markerEnd,
                })
            }

            // Connect hookio to all outbound nodes
            for (let i = 0; i < outboundCount; i++) {
                edges.push({
                    id: `e-hookio-outbound-${i + 1}`,
                    source: 'hookio',
                    target: `outbound-${i + 1}`,
                    animated: true,
                    style: edgeStyle,
                    markerEnd,
                })
            }

            return edges
        }, [inboundCount, outboundCount, initialConfig])

        const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes())
        const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges())

        useImperativeHandle(ref, () => ({
            getData: () => ({
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type!,
                    position: n.position,
                    data: n.data,
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                })),
            })
        }), [nodes, edges])

        const addInbound = useCallback(() => {
            const newCount = inboundCount + 1
            setInboundCount(newCount)

            // Add new node
            const newNode: Node = {
                id: `inbound-${newCount}`,
                type: 'inbound',
                position: { x: 50, y: 80 + (newCount - 1) * 100 },
                data: { route: '/api/new-endpoint' },
            }
            setNodes((nds) => [...nds, newNode])

            // Add edge to hookio with arrow marker
            const newEdge: Edge = {
                id: `e-inbound-${newCount}-hookio`,
                source: `inbound-${newCount}`,
                target: 'hookio',
                animated: true,
                style: { stroke: 'var(--primary)', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--primary)',
                    width: 20,
                    height: 20,
                },
            }
            setEdges((eds) => [...eds, newEdge])
        }, [inboundCount, setNodes, setEdges])

        const addOutbound = useCallback(() => {
            const newCount = outboundCount + 1
            setOutboundCount(newCount)

            // Add new node
            const newNode: Node = {
                id: `outbound-${newCount}`,
                type: 'outbound',
                position: { x: 650, y: 80 + (newCount - 1) * 100 },
                data: { url: 'https://new-endpoint.com/webhook' },
            }
            setNodes((nds) => [...nds, newNode])

            // Add edge from hookio with arrow marker
            const newEdge: Edge = {
                id: `e-hookio-outbound-${newCount}`,
                source: 'hookio',
                target: `outbound-${newCount}`,
                animated: true,
                style: { stroke: 'var(--primary)', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--primary)',
                    width: 20,
                    height: 20,
                },
            }
            setEdges((eds) => [...eds, newEdge])
        }, [outboundCount, setNodes, setEdges])

        const onConnect = useCallback(
            (params: Connection) => {
                setEdges((eds) =>
                    addEdge(
                        {
                            ...params,
                            animated: true,
                            style: { stroke: 'var(--primary)', strokeWidth: 2 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: 'var(--primary)',
                                width: 20,
                                height: 20,
                            },
                        },
                        eds
                    )
                )
            },
            [setEdges]
        )

        return (
            <div className="w-full h-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{
                        maxZoom: 0.7,
                        padding: 0.5,
                    }}
                    minZoom={0.2}
                    maxZoom={2}
                    className="bg-background"
                >
                    <Background color="var(--border)" gap={20} />
                    <Controls className="!bg-card !border-border !shadow-lg" />

                    {/* Add Inbound Button */}
                    <Panel position="top-left" className="m-4">
                        <Button variant="outline" size="sm" onClick={addInbound} className="gap-1">
                            <Plus className="w-4 h-4" /> Inbound
                        </Button>
                    </Panel>

                    {/* Add Outbound Button */}
                    <Panel position="top-right" className="m-4">
                        <Button variant="outline" size="sm" onClick={addOutbound} className="gap-1">
                            <Plus className="w-4 h-4" /> Outbound
                        </Button>
                    </Panel>
                </ReactFlow>
            </div>
        )
    }
)

FlowEditor.displayName = 'FlowEditor'
