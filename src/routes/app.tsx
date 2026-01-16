import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
        headers: request.headers,
    })

    if (!session) return null

    const organizations = await auth.api.listOrganizations({
        headers: request.headers
    })

    let activeOrganizationId = session.session.activeOrganizationId

    // If only one organization and none active, auto-activate it on the server
    if (organizations.length === 1 && !activeOrganizationId) {
        const orgId = organizations[0].id
        try {
            const res = await (auth.api as any).setActiveOrganization({
                headers: request.headers,
                body: { organizationId: orgId }
            })

            // Extract the set-cookie header from better-auth response and propagate it
            const setCookie = res.headers?.get('set-cookie')
            if (setCookie) {
                setResponseHeader('set-cookie', setCookie)
            }
            activeOrganizationId = orgId
        } catch (error) {
            console.error("Failed to auto-activate organization on server:", error)
        }
    }

    return {
        ...session,
        organizations,
        activeOrganizationId
    }
})

export const Route = createFileRoute('/app')({
    beforeLoad: async ({ context, location }) => {
        // Skip check for the select-organization page itself
        if (location.pathname === '/app/select-organization') {
            return
        }

        const session = await getSession()
        if (!session?.user) {
            throw redirect({ to: '/login' })
        }

        if (context.isCloud) {
            if (session.organizations.length === 0) {
                throw redirect({ to: '/onboarding/organization' })
            }

            if (!session.activeOrganizationId) {
                throw redirect({ to: '/app/select-organization' })
            }
        }
    },
    component: AppLayout,
})

function AppLayout() {
    return <Outlet />
}
