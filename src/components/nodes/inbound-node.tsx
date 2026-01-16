import { memo, useState } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { ArrowDownToLine, Check, X } from 'lucide-react'
import { Input } from '../ui/input'

const INBOUND_PREFIX = '/api/webhook/'

interface InboundNodeData {
    label?: string
    route?: string
    path?: string // Alternative field name from modal
}

export const InboundNode = memo(function InboundNode({ id, data }: NodeProps) {
    const nodeData = data as InboundNodeData
    const { setNodes } = useReactFlow()
    // Support both 'route' and 'path' field names
    const storedValue = nodeData.route || nodeData.path || 'my-webhook'
    // Remove prefix if present (for display/editing)
    const suffix = storedValue.replace(INBOUND_PREFIX, '')
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(suffix)

    const handleSave = () => {
        const newPath = INBOUND_PREFIX + editValue
        // Update node data directly through React Flow
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, path: newPath, route: newPath } }
                    : node
            )
        )
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditValue(suffix)
        setIsEditing(false)
    }

    // Full display path
    const displayPath = INBOUND_PREFIX + suffix

    return (
        <div className="bg-card border-2 border-border rounded-xl px-4 py-3 min-w-[220px] shadow-lg">
            <div className="flex items-center gap-2 mb-2">
                <ArrowDownToLine className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">inbound</span>
            </div>

            {isEditing ? (
                <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-muted-foreground">{INBOUND_PREFIX}</span>
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-xs font-mono flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                            if (e.key === 'Escape') handleCancel()
                        }}
                    />
                    <button onClick={handleSave} className="p-1 hover:bg-accent rounded">
                        <Check className="w-3 h-3 text-green-500" />
                    </button>
                    <button onClick={handleCancel} className="p-1 hover:bg-accent rounded">
                        <X className="w-3 h-3 text-red-500" />
                    </button>
                </div>
            ) : (
                <p
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate"
                    onClick={() => setIsEditing(true)}
                    title="Click to edit"
                >
                    {displayPath}
                </p>
            )}

            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
            />
        </div>
    )
})
