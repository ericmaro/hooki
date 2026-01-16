import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Building2, Loader2, ArrowRight } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/app/select-organization')({
  component: SelectOrganization,
})

function SelectOrganization() {
  const router = useRouter()
  const { data: organizations = [] } = authClient.useListOrganizations()
  const { data: activeOrg, isPending } = authClient.useActiveOrganization()

  // No useEffect - server handles auto-activation for single-org users.
  // If we land here and activeOrg is already set, just go back to app.
  if (activeOrg && !isPending) {
    router.navigate({ to: '/app' })
  }

  const handleSelect = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId })
    router.navigate({ to: '/app' })
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground italic">Switching to your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Select Workspace</h1>
          <p className="text-muted-foreground">
            Please choose a workspace to continue.
          </p>
        </div>

        <div className="grid gap-3">
          {organizations?.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org.id)}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-all text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-xs text-muted-foreground">hooki.cloud/{org.slug}</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}

          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => router.navigate({ to: '/onboarding/organization' })}
          >
            Create new workspace
          </Button>
        </div>
      </div>
    </div>
  )
}
