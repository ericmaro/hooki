import { Link } from '@tanstack/react-router'
import { ArrowRight, Edit2, Trash2 } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'

interface FlowCardProps {
    id: string
    name: string
    inboundRoutes: Array<string>
    outboundRoutes: Array<string>
    onDelete?: (id: string) => void
    onEdit?: (id: string) => void
}

export function FlowCard({ id, name, inboundRoutes, outboundRoutes, onDelete, onEdit }: FlowCardProps) {
    return (
        <Card className="p-5 hover:shadow-lg transition-shadow relative group">
            <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg">{name}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit?.(id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Edit Flow"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDelete?.(id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete Flow"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <div className="space-y-3 text-sm">
                <div>
                    <p className="text-muted-foreground text-xs mb-1">
                        inbound {inboundRoutes.length > 1 ? `(${inboundRoutes.length})` : ''}
                    </p>
                    {inboundRoutes.slice(0, 2).map((route, i) => (
                        <p key={i} className="font-mono text-foreground truncate">{route}</p>
                    ))}
                    {inboundRoutes.length === 0 && (
                        <p className="text-muted-foreground italic text-xs">No inbound routes</p>
                    )}
                    {inboundRoutes.length > 2 && (
                        <p className="text-muted-foreground text-xs">+{inboundRoutes.length - 2} more</p>
                    )}
                </div>

                <div>
                    <p className="text-muted-foreground text-xs mb-1">
                        outbound {outboundRoutes.length > 1 ? `(${outboundRoutes.length})` : ''}
                    </p>
                    {outboundRoutes.slice(0, 2).map((route, i) => (
                        <p key={i} className="font-mono text-foreground truncate">{route}</p>
                    ))}
                    {outboundRoutes.length === 0 && (
                        <p className="text-muted-foreground italic text-xs">No outbound routes</p>
                    )}
                    {outboundRoutes.length > 2 && (
                        <p className="text-muted-foreground text-xs">+{outboundRoutes.length - 2} more</p>
                    )}
                </div>
            </div>

            <Link
                to="/app/flow/$flowId"
                params={{ flowId: id }}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
                view <ArrowRight className="w-4 h-4" />
            </Link>
        </Card>
    )
}
