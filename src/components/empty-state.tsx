import { FolderPlus } from 'lucide-react'
import { Button } from './ui/button'

interface EmptyStateProps {
    onCreateProject?: () => void
    type?: 'project' | 'flow'
    onCreateFlow?: () => void
}

export function EmptyState({ onCreateProject, onCreateFlow, type = 'project' }: EmptyStateProps) {
    if (type === 'flow') {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-6">
                <Button
                    variant="outline"
                    onClick={onCreateFlow}
                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50 transition-all"
                >
                    <span className="text-4xl text-muted-foreground/50">+</span>
                </Button>
                <p className="text-lg text-muted-foreground font-medium">
                    Create your first flow
                </p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col items-center justify-center gap-6">
            <Button
                variant="outline"
                onClick={onCreateProject}
                className="w-32 h-32 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50 transition-all"
            >
                <FolderPlus className="w-12 h-12 text-muted-foreground/50" />
            </Button>
            <p className="text-lg text-muted-foreground font-medium">
                Create your first project
            </p>
        </div>
    )
}
