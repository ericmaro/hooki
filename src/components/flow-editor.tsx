import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
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

// Default colors for nodes
const DEFAULT_INBOUND_COLOR = '#3b82f6' // blue
const DEFAULT_OUTBOUND_COLOR = '#22c55e' // green
const HOOKI_COLOR = '#18181b' // neutral dark

// Arrow marker size
const ARROW_SIZE = 12

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

// Central Hooki node
function HookiNode() {
    return (
        <div className="bg-primary text-primary-foreground rounded-xl px-6 py-4 min-w-[120px] shadow-lg text-center">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary"
            />
            <span className="font-semibold">hooki</span>
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary"
            />
        </div>
    )
}

// Helper to get node color
function getNodeColor(nodes: Node[], nodeId: string): string {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return DEFAULT_INBOUND_COLOR

    if (node.type === 'hooki' || node.type === 'hookly') {
        return HOOKI_COLOR
    }

    // Get color from node data, or use default based on type
    const nodeColor = node.data?.color as string | undefined
    if (nodeColor) return nodeColor

    return node.type === 'inbound' ? DEFAULT_INBOUND_COLOR : DEFAULT_OUTBOUND_COLOR
}

// Create edge with dynamic color
// For edges going TO outbound nodes, use target color; otherwise use source color
function createStyledEdge(
    id: string,
    source: string,
    target: string,
    nodes: Node[],
    useTargetColor?: boolean
): Edge {
    const colorNodeId = useTargetColor ? target : source
    const color = getNodeColor(nodes, colorNodeId)
    return {
        id,
        source,
        target,
        animated: true,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: ARROW_SIZE,
            height: ARROW_SIZE,
        },
    }
}

export const FlowEditor = forwardRef<FlowEditorRef, FlowEditorProps>(
    ({ inboundRoutes: initialInbound = [], outboundRoutes: initialOutbound = [], initialConfig }, ref) => {
        const [inboundCount, setInboundCount] = useState(Math.max(initialInbound.length, 1))
        const [outboundCount, setOutboundCount] = useState(Math.max(initialOutbound.length, 1))

        const nodeTypes: NodeTypes = useMemo(
            () => ({
                inbound: InboundNode,
                outbound: OutboundNode,
                hooki: HookiNode,
                hookly: HookiNode, // Backwards compatibility for old saved configs
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

            // Add central hooki node
            const maxCount = Math.max(inboundCount, outboundCount)
            const centerY = 80 + ((maxCount - 1) * 100) / 2
            nodes.push({
                id: 'hooki',
                type: 'hooki',
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

        const buildEdges = useCallback((currentNodes: Node[]) => {
            if (initialConfig?.edges && initialConfig.edges.length > 0) {
                // Apply styling to loaded edges
                return initialConfig.edges.map(edge => {
                    const targetNode = currentNodes.find(n => n.id === edge.target)
                    const useTargetColor = targetNode?.type === 'outbound'
                    return createStyledEdge(edge.id, edge.source, edge.target, currentNodes, useTargetColor)
                })
            }

            const edges: Array<Edge> = []

            // Connect all inbound nodes to hooki
            for (let i = 0; i < inboundCount; i++) {
                const nodeId = `inbound-${i + 1}`
                edges.push(createStyledEdge(
                    `e-inbound-${i + 1}-hooki`,
                    nodeId,
                    'hooki',
                    currentNodes
                ))
            }

            // Connect hooki to all outbound nodes
            for (let i = 0; i < outboundCount; i++) {
                const targetId = `outbound-${i + 1}`
                edges.push(createStyledEdge(
                    `e-hooki-outbound-${i + 1}`,
                    'hooki',
                    targetId,
                    currentNodes,
                    true // use target color for edges going to outbound nodes
                ))
            }

            return edges
        }, [inboundCount, outboundCount, initialConfig])

        const initialNodes = useMemo(() => buildNodes(), [buildNodes])
        const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
        const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(initialNodes))

        // Update edge colors when node colors change
        useEffect(() => {
            setEdges((currentEdges) =>
                currentEdges.map((edge) => {
                    // For edges going to outbound nodes, use target color
                    const targetNode = nodes.find(n => n.id === edge.target)
                    const useTargetColor = targetNode?.type === 'outbound'
                    const colorNodeId = useTargetColor ? edge.target : edge.source
                    const color = getNodeColor(nodes, colorNodeId)
                    return {
                        ...edge,
                        style: { stroke: color, strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: color,
                            width: ARROW_SIZE,
                            height: ARROW_SIZE,
                        },
                    }
                })
            )
        }, [nodes, setEdges])

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

            // Add edge to hooki (color will be updated by effect)
            const newEdge = createStyledEdge(
                `e-inbound-${newCount}-hooki`,
                `inbound-${newCount}`,
                'hooki',
                [...nodes, newNode]
            )
            setEdges((eds) => [...eds, newEdge])
        }, [inboundCount, nodes, setNodes, setEdges])

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

            // Add edge from hooki (uses outbound node's color)
            const newEdge = createStyledEdge(
                `e-hooki-outbound-${newCount}`,
                'hooki',
                `outbound-${newCount}`,
                [...nodes, newNode],
                true // use target color
            )
            setEdges((eds) => [...eds, newEdge])
        }, [outboundCount, nodes, setNodes, setEdges])

        const onConnect = useCallback(
            (params: Connection) => {
                const sourceColor = getNodeColor(nodes, params.source!)
                setEdges((eds) =>
                    addEdge(
                        {
                            ...params,
                            animated: true,
                            style: { stroke: sourceColor, strokeWidth: 2 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: sourceColor,
                                width: ARROW_SIZE,
                                height: ARROW_SIZE,
                            },
                        },
                        eds
                    )
                )
            },
            [nodes, setEdges]
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
