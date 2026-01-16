import {
    FolderPlus,
    LogOut,
    Settings,
    User,
    Workflow
} from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { signOut } from '@/lib/auth-client'

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
    const navigate = useNavigate()

    return (
        <aside className="w-16 h-screen bg-card border-r border-border flex flex-col items-center py-4 gap-4">
            {/* App Logo */}
            <Link to="/" className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Workflow className="w-5 h-5 text-primary-foreground" />
            </Link>

            {/* Projects Section */}
            <div className="flex-1 w-full flex flex-col items-center gap-2 px-2 overflow-y-auto">
                {projects.map((project) => (
                    <button
                        key={project.id}
                        onClick={() => onSelectProject?.(project.id)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${selectedProjectId === project.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-accent'
                            }`}
                        title={project.name}
                    >
                        {project.name.charAt(0).toUpperCase()}
                    </button>
                ))}

                {/* Add Project Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCreateProject}
                    className="w-10 h-10 opacity-50 hover:opacity-100"
                    title="New Project"
                >
                    <FolderPlus className="w-4 h-4" />
                </Button>
            </div>

            {/* User Nav */}
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
                            <User className="w-5 h-5" />
                        </Button>
                    }
                />
                <DropdownMenuContent side="right" align="end" sideOffset={12} className="min-w-[160px]">
                    <DropdownMenuItem
                        onClick={() => navigate({ to: '/setup' })}
                        className="cursor-pointer"
                    >
                        <Settings className="mr-2 w-4 h-4" />
                        Configurations
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={async () => {
                            await signOut()
                            window.location.href = '/login'
                        }}
                        className="text-destructive focus:text-destructive cursor-pointer"
                    >
                        <LogOut className="mr-2 w-4 h-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </aside>
    )
}
