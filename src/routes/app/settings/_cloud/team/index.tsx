import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc-client'
import { useRouter, createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/app-layout'
import { Users, Mail, UserPlus, MoreVertical, Shield, User as UserIcon, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const projectsQueryOptions = queryOptions({
    queryKey: ['projects'],
    queryFn: () => (rpc.projects.list as any)({}),
})

// Team management page (Cloud only)
export const Route = createFileRoute('/app/settings/_cloud/team/')({
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(projectsQueryOptions)
    },
    component: TeamPage,
})

function TeamPage() {
    const router = useRouter()
    const { data: organizations = [] } = authClient.useListOrganizations()
    const { data: activeOrg } = authClient.useActiveOrganization()
    const { data: projects = [] } = useSuspenseQuery(projectsQueryOptions)

    const session = authClient.useSession()

    // Determine active organization ID from various sources
    const activeOrgId = activeOrg?.id || (session.data?.session as any)?.activeOrganizationId || (organizations && organizations.length > 0 ? organizations[0].id : null)

    const members = (activeOrg as any)?.members || []
    const invitations = (activeOrg as any)?.invitations || []


    const handleInvite = async () => {
        const email = window.prompt("Enter email to invite:")
        if (email) {
            await authClient.organization.inviteMember({
                email,
                role: "member",
            })
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (window.confirm("Are you sure you want to remove this member?")) {
            await authClient.organization.removeMember({
                memberIdOrEmail: memberId,
            })
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
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Team</h1>
                        <p className="text-muted-foreground">
                            Manage your organization's members and their access levels.
                        </p>
                    </div>
                    <Button className="gap-2" onClick={handleInvite}>
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                    </Button>
                </div>

                {!activeOrgId ? (
                    organizations && organizations.length > 0 ? (
                        <div className="text-center py-20 border border-dashed rounded-xl">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-3 rounded-full bg-primary/10 text-primary animate-pulse">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-semibold">Initializing Organization...</h2>
                                <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                                    We're setting up your organization context. This should only take a moment.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 border border-dashed rounded-xl">
                            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <h2 className="text-xl font-semibold mb-2">No Active Organization</h2>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                Please select or create an organization in the sidebar to manage your team.
                            </p>
                        </div>
                    )
                ) : (
                    <div className="grid gap-8">
                        {/* Members List */}
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                            <div className="p-6 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <h2 className="font-semibold text-lg">Members</h2>
                                </div>
                            </div>
                            <div className="divide-y divide-border">
                                {members.map((member: any) => (
                                    <div key={member.id} className="p-6 flex items-center justify-between group hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {member.user.name?.charAt(0).toUpperCase() || "U"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">{member.user.name}</p>
                                                    {session.data?.user.id === member.userId && (
                                                        <Badge variant="secondary" className="px-1 py-0 text-[10px]">You</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                member.role === "owner" ? "bg-primary/10 text-primary border-primary/20" :
                                                    member.role === "admin" ? "bg-secondary text-secondary-foreground border-border" :
                                                        "bg-muted text-muted-foreground border-border"
                                            )}>
                                                {member.role === "owner" ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem disabled={member.role === "owner"}>Change Role</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            disabled={session.data?.user.id === member.userId}
                                                        >
                                                            {session.data?.user.id === member.userId ? "Leave Organization" : "Remove from Team"}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pending Invitations */}
                        {invitations.length > 0 && (
                            <div className="bg-card rounded-xl border border-border overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <h2 className="font-semibold text-lg">Pending Invitations</h2>
                                    </div>
                                    <Badge variant="outline" className="font-normal">{invitations.length} {invitations.length === 1 ? "invitation" : "invitations"}</Badge>
                                </div>
                                <div className="p-0">
                                    {invitations.map((inv: any) => (
                                        <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-muted/50 border border-dashed border-border flex items-center justify-center">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{inv.email}</p>
                                                    <p className="text-xs text-muted-foreground">Invited as {inv.role} • Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className="text-xs font-medium">{inv.role}</Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={async () => {
                                                        await authClient.organization.cancelInvitation({
                                                            invitationId: inv.id,
                                                        })
                                                    }}
                                                >
                                                    Revoke
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
