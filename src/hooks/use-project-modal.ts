import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { rpc } from '@/lib/rpc-client'

export function useProjectModal() {
    const [projectModalOpen, setProjectModalOpen] = useState(false)
    const queryClient = useQueryClient()
    const router = useRouter()

    const handleCreateProject = useCallback(async (data: { name: string }) => {
        const newProject = await (rpc.projects.create as any)({ name: data.name })
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
        setProjectModalOpen(false)
        // Navigate to the new project page
        router.navigate({
            to: '/app/project/$projectId',
            params: { projectId: newProject.id }
        })
    }, [queryClient, router])

    return {
        projectModalOpen,
        setProjectModalOpen,
        openProjectModal: () => setProjectModalOpen(true),
        handleCreateProject,
    }
}
