import { ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'

interface Project {
    id: string
    name: string
}

interface AppLayoutProps {
    children: ReactNode
    projects?: Project[]
    selectedProjectId?: string | null
    onSelectProject?: (projectId: string) => void
    onCreateProject?: () => void
}

export function AppLayout({
    children,
    projects,
    selectedProjectId,
    onSelectProject,
    onCreateProject,
}: AppLayoutProps) {
    return (
        <div className="flex h-screen bg-background">
            <AppSidebar
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={onSelectProject}
                onCreateProject={onCreateProject}
            />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
