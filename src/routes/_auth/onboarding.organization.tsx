import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_auth/onboarding/organization')({
    component: OrganizationOnboarding,
})

function OrganizationOnboarding() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsLoading(true)
        try {
            const { data, error } = await authClient.organization.create({
                name: name.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
            })

            if (error) {
                console.error("Failed to create organization:", error)
                alert(error.message || "Failed to create organization")
                return
            }

            if (data) {
                // Explicitly set the new organization as active to avoid the selection gate
                await authClient.organization.setActive({ organizationId: data.id })
                router.navigate({ to: '/app' })
            }
        } catch (err) {
            console.error("Error creating organization:", err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <div className="text-center lg:text-left space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-4">
                    <Building2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Create your Workspace</h2>
                <p className="text-muted-foreground">
                    Your workspace is where you and your team will manage webhooks and flows.
                </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                        id="org-name"
                        placeholder="Acme Inc."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        required
                    />
                    <p className="text-xs text-muted-foreground">You can always change this later in settings.</p>
                </div>

                <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={isLoading || !name.trim()}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Create Organization
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground pt-2">
                By creating an organization, you agree to our Terms of Service and Privacy Policy.
            </p>
        </>
    )
}
