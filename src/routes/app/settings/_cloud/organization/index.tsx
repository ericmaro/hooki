import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter, createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/app-layout'
import { Building2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { useState, useEffect } from 'react'

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

// Organization page (Cloud only)
export const Route = createFileRoute('/app/settings/_cloud/organization/')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: OrganizationPage,
})

function OrganizationPage() {
    const router = useRouter()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)
    const { data: activeOrg } = authClient.useActiveOrganization()

    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')

    useEffect(() => {
        if (activeOrg) {
            setName(activeOrg.name)
            setSlug(activeOrg.slug)
        }
    }, [activeOrg])

    const handleUpdate = async () => {
        if (activeOrg) {
            await authClient.organization.update({
                data: {
                    name,
                    slug,
                }
            })
            alert("Organization updated successfully")
        }
    }

    return (
        <AppLayout
            projects={projects}
            onSelectProject={(_projectId) => {
                router.navigate({ to: '/app' })
            }}
        >
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Organization</h1>
                    <p className="text-muted-foreground">
                        Manage your organization's identity and global settings.
                    </p>
                </div>

                {!activeOrg ? (
                    <div className="text-center py-20 border border-dashed rounded-xl">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h2 className="text-xl font-semibold mb-2">No Active Organization</h2>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                            Please select or create an organization in the sidebar to manage settings.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {/* General Settings */}
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                            <div className="p-6 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <h2 className="font-semibold text-lg">General Settings</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="org-name">Organization Name</Label>
                                    <input
                                        type="text"
                                        id="org-name"
                                        placeholder="Acme Inc."
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <p className="text-xs text-muted-foreground">This is your organization's visible name.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="org-slug">Slug</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-sm">hooki.cloud/</span>
                                        <input
                                            type="text"
                                            id="org-slug"
                                            placeholder="acme"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">The unique slug used in your organization's URL.</p>
                                </div>

                                <div className="pt-4 border-t border-border flex justify-end">
                                    <Button className="gap-2" onClick={handleUpdate}>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Logo & Branding */}
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                            <div className="p-6 border-b border-border bg-muted/30">
                                <h2 className="font-semibold text-lg">Logo & Branding</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center text-2xl font-bold text-muted-foreground">
                                        {activeOrg.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="space-y-2">
                                        <Button variant="outline">Upload New Logo</Button>
                                        <p className="text-xs text-muted-foreground">Recommended size: 256x256px. PNG or SVG.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
