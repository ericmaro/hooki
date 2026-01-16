import { createFileRoute } from '@tanstack/react-router'

// Team management page (Cloud only)
export const Route = createFileRoute('/app/settings/team/')({
    component: TeamPage,
})

function TeamPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Team</h1>
            <p className="text-muted-foreground mb-6">
                Manage team members and permissions.
            </p>

            {/* Team Members */}
            <div className="rounded-xl border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">Members</h3>
                    <button className="text-sm text-primary hover:underline">
                        Invite Member
                    </button>
                </div>
                <div className="p-4">
                    <div className="flex items-center gap-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">Y</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">You</p>
                            <p className="text-sm text-muted-foreground">Owner</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TODO: Team management functionality */}
        </div>
    )
}
