import { createFileRoute, redirect } from '@tanstack/react-router'

// Root route - redirects to dashboard
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/app' })
  },
})
