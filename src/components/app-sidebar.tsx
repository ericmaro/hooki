import {
    FolderPlus,
    Settings,
    ChevronDown,
    Building2,
    LayoutGrid
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { authClient } from '@/lib/auth-client'

interface Project {
    id: string
    name: string
}

interface AppSidebarProps {
    projects?: Array<Project>
    selectedProjectId?: string | null
    onSelectProject?: (projectId: string) => void
    onCreateProject?: () => void
}

export function AppSidebar({
    projects = [],
    selectedProjectId,
    onSelectProject,
    onCreateProject,
}: AppSidebarProps) {
    const { data: organizations = [] } = authClient.useListOrganizations()
    const { data: activeOrg } = authClient.useActiveOrganization()

    const handleSwitchOrg = async (orgId: string) => {
        try {
            await authClient.organization.setActive({ organizationId: orgId })
        } catch (error) {
            console.error("Failed to set active organization:", error)
        }
    }

    const handleCreateOrg = async () => {
        const name = window.prompt("Enter organization name:")
        if (name) {
            await authClient.organization.create({
                name,
                slug: name.toLowerCase().replace(/\s+/g, '-'),
            })
        }
    }

    return (
        <aside className="w-16 h-screen bg-card border-r border-border flex flex-col items-center py-4 gap-4">
            {/* Organization Switcher / App Logo */}
            <div className="w-full px-2 mb-2">
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger>
                            <DropdownMenuTrigger asChild>
                                <button className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors group relative">
                                    {activeOrg ? (
                                        <span className="text-lg font-bold">{activeOrg.name.charAt(0).toUpperCase()}</span>
                                    ) : (
                                        <Building2 className="w-6 h-6" />
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {activeOrg?.name || 'Organization'}
                        </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(organizations || []).map((org) => (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => handleSwitchOrg(org.id)}
                                    className="flex items-center gap-3 py-2 cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold">
                                        {org.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-medium truncate">{org.name}</p>
                                    </div>
                                    {activeOrg?.id === org.id && (
                                        <Badge variant="secondary" className="px-1 py-0 text-[10px]">Active</Badge>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={handleCreateOrg}
                                className="flex items-center gap-2 py-2 cursor-pointer text-muted-foreground"
                            >
                                <Building2 className="w-4 h-4" />
                                <span className="text-sm">Create New</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Separator className="w-8 mb-2" />

            {/* Projects Section */}
            <div className="flex-1 w-full flex flex-col items-center gap-2 px-2 overflow-y-auto">
                {projects.map((project) => (
                    <Tooltip key={project.id}>
                        <TooltipTrigger>
                            <button
                                onClick={() => onSelectProject?.(project.id)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${selectedProjectId === project.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary hover:bg-accent'
                                    }`}
                            >
                                {project.name.charAt(0).toUpperCase()}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {project.name}
                        </TooltipContent>
                    </Tooltip>
                ))}

                {/* Add Project Button */}
                <Tooltip>
                    <TooltipTrigger>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onCreateProject}
                            className="w-10 h-10 opacity-50 hover:opacity-100"
                        >
                            <FolderPlus className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        New Project
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* All Projects Link */}
            <Tooltip>
                <TooltipTrigger>
                    <Link
                        to="/app"
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                        activeOptions={{ exact: true }}
                        activeProps={{ className: 'bg-primary/10 text-primary' }}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                    All Projects
                </TooltipContent>
            </Tooltip>

            {/* Settings Link */}
            <Tooltip>
                <TooltipTrigger>
                    <Link
                        to="/app/settings"
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                        activeProps={{ className: 'bg-primary/10 text-primary' }}
                    >
                        <Settings className="w-5 h-5" />
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                    Settings
                </TooltipContent>
            </Tooltip>
        </aside>
    )
}
