import { createFileRoute } from '@tanstack/react-router'
import { User, Mail, Save, ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter, Link } from '@tanstack/react-router'
import { useProjectModal } from '@/hooks/use-project-modal'
import { ProjectModal } from '@/components/project-modal'
import { useSession, authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

export const Route = createFileRoute('/app/settings/profile')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: ProfileSettings,
})

function ProfileSettings() {
    const router = useRouter()
    const { data: session } = useSession()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)
    const { projectModalOpen, setProjectModalOpen, openProjectModal, handleCreateProject } = useProjectModal()

    const [name, setName] = useState(session?.user?.name || '')
    const [isSaving, setIsSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Sync name when session loads
    useEffect(() => {
        if (session?.user?.name) {
            setName(session.user.name)
        }
    }, [session?.user?.name])

    const handleSave = async () => {
        setIsSaving(true)
        setError('')
        setSuccess(false)

        try {
            await authClient.updateUser({
                name,
            })
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AppLayout
            projects={projects}
            onSelectProject={(projectId) => {
                router.navigate({ to: '/app/project/$projectId', params: { projectId } })
            }}
            onCreateProject={openProjectModal}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <div className="mb-8">
                    <Link
                        to="/app/settings"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Settings
                    </Link>
                    <h1 className="text-2xl font-bold mb-2">Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your personal information.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Avatar section */}
                    <div className="p-6 rounded-xl border border-border">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold">
                                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h3 className="font-medium">{session?.user?.name || 'User'}</h3>
                                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Profile form */}
                    <div className="p-6 rounded-xl border border-border space-y-6">
                        <h2 className="font-semibold">Personal Information</h2>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
                                Profile updated successfully!
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={session?.user?.email || ''}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Email cannot be changed.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || name === session?.user?.name}
                                className="gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ProjectModal
                open={projectModalOpen}
                onOpenChange={setProjectModalOpen}
                onSubmit={handleCreateProject}
            />
        </AppLayout>
    )
}
