import { useState } from 'react'
import { AlertDialog } from '@base-ui/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { FolderPlus } from 'lucide-react'

interface ProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: { name: string }) => void
}

export function ProjectModal({ open, onOpenChange, onSubmit }: ProjectModalProps) {
    const [name, setName] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onSubmit({ name: name.trim() })
            setName('')
            onOpenChange(false)
        }
    }

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-xl">
                    <AlertDialog.Title className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-primary" />
                        New Project
                    </AlertDialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                                id="project-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. E-commerce Platform"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create</Button>
                        </div>
                    </form>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
