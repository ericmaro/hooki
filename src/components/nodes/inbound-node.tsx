import { memo, useState } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { ArrowDownToLine, Check, X, Shield } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../ui/popover'
import { Textarea } from '../ui/textarea'
import { ColorPicker } from '../color-picker'

const INBOUND_PREFIX = '/api/webhook/'
const DEFAULT_COLOR = '#3b82f6' // blue

interface InboundNodeData {
    label?: string
    color?: string
    route?: string
    path?: string
    allowedIps?: string[]
}

export const InboundNode = memo(function InboundNode({ id, data }: NodeProps) {
    const nodeData = data as InboundNodeData
    const { setNodes } = useReactFlow()

    // Route path handling
    const storedValue = nodeData.route || nodeData.path || 'my-webhook'
    const suffix = storedValue.replace(INBOUND_PREFIX, '')
    const [isEditingPath, setIsEditingPath] = useState(false)
    const [editPathValue, setEditPathValue] = useState(suffix)

    // Label handling
    const label = nodeData.label || 'inbound'
    const color = nodeData.color || DEFAULT_COLOR
    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [editLabelValue, setEditLabelValue] = useState(label)

    // IP whitelist state
    const allowedIps = nodeData.allowedIps || []
    const [ipPopoverOpen, setIpPopoverOpen] = useState(false)
    const [ipListText, setIpListText] = useState(allowedIps.join('\n'))

    const handleSavePath = () => {
        const newPath = INBOUND_PREFIX + editPathValue
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, path: newPath, route: newPath } }
                    : node
            )
        )
        setIsEditingPath(false)
    }

    const handleCancelPath = () => {
        setEditPathValue(suffix)
        setIsEditingPath(false)
    }

    const handleSaveLabel = () => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, label: editLabelValue || 'inbound' } }
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

    const handleSaveIps = () => {
        const ips = ipListText
            .split(/[\n,]/)
            .map(ip => ip.trim())
            .filter(ip => ip.length > 0)

        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, allowedIps: ips } }
                    : node
            )
        )
        setIpPopoverOpen(false)
    }

    const displayPath = INBOUND_PREFIX + suffix

    return (
        <div className="bg-card border-2 border-border rounded-xl px-4 py-3 min-w-[220px] shadow-lg">
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

                <ArrowDownToLine className="w-4 h-4 text-muted-foreground ml-auto" />

                {/* IP Whitelist Badge */}
                <Popover open={ipPopoverOpen} onOpenChange={setIpPopoverOpen}>
                    <PopoverTrigger
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${allowedIps.length > 0
                                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            }`}
                        title={allowedIps.length > 0 ? `${allowedIps.length} IP(s) allowed` : 'No IP restriction'}
                    >
                        <Shield className="w-3 h-3" />
                        {allowedIps.length > 0 ? allowedIps.length : '–'}
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-medium text-sm mb-1">IP Whitelist</h4>
                                <p className="text-xs text-muted-foreground">
                                    Only allow requests from these IPs. Leave empty to allow all.
                                    Supports CIDR notation (e.g., 192.168.1.0/24).
                                </p>
                            </div>
                            <Textarea
                                placeholder="Enter IPs (one per line)&#10;e.g., 192.168.1.1&#10;or 10.0.0.0/8"
                                value={ipListText}
                                onChange={(e) => setIpListText(e.target.value)}
                                className="h-24 text-xs font-mono"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIpPopoverOpen(false)}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveIps}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {isEditingPath ? (
                <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-muted-foreground">{INBOUND_PREFIX}</span>
                    <Input
                        value={editPathValue}
                        onChange={(e) => setEditPathValue(e.target.value)}
                        className="h-7 text-xs font-mono flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePath()
                            if (e.key === 'Escape') handleCancelPath()
                        }}
                    />
                    <button onClick={handleSavePath} className="p-1 hover:bg-accent rounded">
                        <Check className="w-3 h-3 text-green-500" />
                    </button>
                    <button onClick={handleCancelPath} className="p-1 hover:bg-accent rounded">
                        <X className="w-3 h-3 text-red-500" />
                    </button>
                </div>
            ) : (
                <p
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground hover:bg-accent/50 px-2 py-1 rounded transition-colors truncate"
                    onClick={() => setIsEditingPath(true)}
                    title="Click to edit path"
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
