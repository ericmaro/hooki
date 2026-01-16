import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Plus, X } from 'lucide-react'
import { AlertDialog } from '@base-ui/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from './ui/input-group'
import { Label } from './ui/label'

const INBOUND_PREFIX = '/api/webhook/'

interface FlowModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: { name: string; inboundRoutes: Array<string>; outboundRoutes: Array<string> }) => void
    initialData?: { name: string; inboundRoutes: Array<string>; outboundRoutes: Array<string> }
}

export function FlowModal({ open, onOpenChange, onSubmit, initialData }: FlowModalProps) {
    const [name, setName] = useState(initialData?.name || '')
    const [inboundRoutes, setInboundRoutes] = useState<Array<string>>(
        initialData?.inboundRoutes && initialData.inboundRoutes.length > 0
            ? initialData.inboundRoutes.map(r => r.replace(INBOUND_PREFIX, ''))
            : ['my-webhook']
    )
    const [outboundRoutes, setOutboundRoutes] = useState<Array<string>>(
        initialData?.outboundRoutes && initialData.outboundRoutes.length > 0
            ? initialData.outboundRoutes
            : ['https://']
    )

    useEffect(() => {
        if (open) {
            setName(initialData?.name || '')
            setInboundRoutes(
                initialData?.inboundRoutes && initialData.inboundRoutes.length > 0
                    ? initialData.inboundRoutes.map(r => r.replace(INBOUND_PREFIX, ''))
                    : ['my-webhook']
            )
            setOutboundRoutes(
                initialData?.outboundRoutes && initialData.outboundRoutes.length > 0
                    ? initialData.outboundRoutes
                    : ['https://']
            )
        }
    }, [open, initialData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const validInbound = inboundRoutes.filter(r => r.trim()).map(r => INBOUND_PREFIX + r.trim())
        const validOutbound = outboundRoutes.filter(r => r.trim())

        // Only require name - routes can be configured later in the editor
        if (!name.trim()) {
            console.warn('Flow creation blocked: name is required')
            return
        }

        console.log('Submitting flow:', { name: name.trim(), inboundRoutes: validInbound, outboundRoutes: validOutbound })
        onSubmit({ name: name.trim(), inboundRoutes: validInbound, outboundRoutes: validOutbound })

        // Reset form state
        setName('')
        setInboundRoutes(['/api/'])
        setOutboundRoutes(['https://'])
        // Note: parent handles closing the modal via onSubmit callback
    }

    const addInboundRoute = () => setInboundRoutes([...inboundRoutes, 'new-endpoint'])
    const removeInboundRoute = (index: number) => setInboundRoutes(inboundRoutes.filter((_, i) => i !== index))
    const updateInboundRoute = (index: number, value: string) => {
        const updated = [...inboundRoutes]
        updated[index] = value
        setInboundRoutes(updated)
    }

    const addOutboundRoute = () => setOutboundRoutes([...outboundRoutes, 'https://'])
    const removeOutboundRoute = (index: number) => setOutboundRoutes(outboundRoutes.filter((_, i) => i !== index))
    const updateOutboundRoute = (index: number, value: string) => {
        const updated = [...outboundRoutes]
        updated[index] = value
        setOutboundRoutes(updated)
    }

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
                    <AlertDialog.Title className="text-xl font-semibold mb-4">
                        {initialData ? 'Edit Flow' : 'Create New Flow'}
                    </AlertDialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="flow-name">Flow Name</Label>
                            <Input
                                id="flow-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Payment Webhooks"
                                autoFocus
                            />
                        </div>

                        {/* Inbound Routes */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <ArrowDownToLine className="w-4 h-4 text-primary" />
                                    Inbound Routes
                                </Label>
                                <Button type="button" variant="ghost" size="sm" onClick={addInboundRoute} className="gap-1 h-7 text-xs">
                                    <Plus className="w-3 h-3" /> Add
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {inboundRoutes.map((route, index) => (
                                    <div key={index} className="flex gap-2">
                                        <InputGroup className="flex-1">
                                            <InputGroupAddon>
                                                <InputGroupText className="text-xs font-mono">{INBOUND_PREFIX}</InputGroupText>
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                value={route}
                                                onChange={(e) => updateInboundRoute(index, e.target.value)}
                                                placeholder="my-webhook"
                                                className="font-mono text-sm"
                                            />
                                        </InputGroup>
                                        {inboundRoutes.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeInboundRoute(index)} className="shrink-0">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">Where webhook requests come in</p>
                        </div>

                        {/* Outbound Routes */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <ArrowUpFromLine className="w-4 h-4 text-primary" />
                                    Outbound Routes
                                </Label>
                                <Button type="button" variant="ghost" size="sm" onClick={addOutboundRoute} className="gap-1 h-7 text-xs">
                                    <Plus className="w-3 h-3" /> Add
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {outboundRoutes.map((route, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            value={route}
                                            onChange={(e) => updateOutboundRoute(index, e.target.value)}
                                            placeholder="https://api.example.com/webhook"
                                        />
                                        {outboundRoutes.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOutboundRoute(index)} className="shrink-0">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">Where requests are forwarded</p>
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {initialData ? 'Save' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
