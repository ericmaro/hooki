import { memo, useState } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { ArrowUpFromLine, Check, X } from 'lucide-react'
import { Input } from '../ui/input'

interface OutboundNodeData {
    label?: string
    url?: string
}

export const OutboundNode = memo(function OutboundNode({ id, data }: NodeProps) {
    const nodeData = data as OutboundNodeData
    const { setNodes } = useReactFlow()
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(nodeData.url || 'https://example.com/webhook')

    const handleSave = () => {
        // Update node data directly through React Flow
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, url: editValue } }
                    : node
            )
        )
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditValue(nodeData.url || 'https://example.com/webhook')
        setIsEditing(false)
    }

    return (
        <div className="bg-card border-2 border-border rounded-xl px-4 py-3 min-w-[200px] shadow-lg">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
            />

            <div className="flex items-center gap-2 mb-2">
                <ArrowUpFromLine className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">outbound</span>
            </div>

            {isEditing ? (
                <div className="flex items-center gap-1">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-xs font-mono"
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
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate max-w-[220px]"
                    onClick={() => setIsEditing(true)}
                    title="Click to edit"
                >
                    {nodeData.url || 'https://example.com/webhook'}
                </p>
            )}
        </div>
    )
})
