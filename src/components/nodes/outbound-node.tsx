import { memo, useState } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { ArrowUpFromLine, Check, X } from 'lucide-react'
import { Input } from '../ui/input'
import { ColorPicker } from '../color-picker'

const DEFAULT_COLOR = '#22c55e' // green

interface OutboundNodeData {
    label?: string
    color?: string
    url?: string
}

export const OutboundNode = memo(function OutboundNode({ id, data }: NodeProps) {
    const nodeData = data as OutboundNodeData
    const { setNodes } = useReactFlow()

    // URL handling
    const [isEditingUrl, setIsEditingUrl] = useState(false)
    const [editUrlValue, setEditUrlValue] = useState(nodeData.url || 'https://example.com/webhook')

    // Label handling
    const label = nodeData.label || 'outbound'
    const color = nodeData.color || DEFAULT_COLOR
    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [editLabelValue, setEditLabelValue] = useState(label)

    const handleSaveUrl = () => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, url: editUrlValue } }
                    : node
            )
        )
        setIsEditingUrl(false)
    }

    const handleCancelUrl = () => {
        setEditUrlValue(nodeData.url || 'https://example.com/webhook')
        setIsEditingUrl(false)
    }

    const handleSaveLabel = () => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, label: editLabelValue || 'outbound' } }
                    : node
            )
        )
        setIsEditingLabel(false)
    }

    const handleCancelLabel = () => {
        setEditLabelValue(label)
        setIsEditingLabel(false)
    }

    const handleColorChange = (newColor: string) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, color: newColor } }
                    : node
            )
        )
    }

    return (
        <div className="bg-card border-2 border-border rounded-xl px-4 py-3 min-w-[200px] shadow-lg">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
            />

            <div className="flex items-center gap-2 mb-2">
                {/* Color dot + Label */}
                <ColorPicker color={color} onChange={handleColorChange} />

                {isEditingLabel ? (
                    <div className="flex items-center gap-1 flex-1">
                        <Input
                            value={editLabelValue}
                            onChange={(e) => setEditLabelValue(e.target.value)}
                            className="h-6 text-sm font-semibold w-24"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLabel()
                                if (e.key === 'Escape') handleCancelLabel()
                            }}
                            onBlur={handleSaveLabel}
                        />
                    </div>
                ) : (
                    <span
                        className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                        onDoubleClick={() => setIsEditingLabel(true)}
                        title="Double-click to edit label"
                    >
                        {label}
                    </span>
                )}

                <ArrowUpFromLine className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>

            {isEditingUrl ? (
                <div className="flex items-center gap-1">
                    <Input
                        value={editUrlValue}
                        onChange={(e) => setEditUrlValue(e.target.value)}
                        className="h-7 text-xs font-mono"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveUrl()
                            if (e.key === 'Escape') handleCancelUrl()
                        }}
                    />
                    <button onClick={handleSaveUrl} className="p-1 hover:bg-accent rounded">
                        <Check className="w-3 h-3 text-green-500" />
                    </button>
                    <button onClick={handleCancelUrl} className="p-1 hover:bg-accent rounded">
                        <X className="w-3 h-3 text-red-500" />
                    </button>
                </div>
            ) : (
                <p
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate max-w-[220px]"
                    onClick={() => setIsEditingUrl(true)}
                    title="Click to edit URL"
                >
                    {nodeData.url || 'https://example.com/webhook'}
                </p>
            )}
        </div>
    )
})
