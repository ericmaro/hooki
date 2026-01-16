import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '../components/_cloud/landing-page'

// Check if we're in cloud mode
const isCloudMode = typeof process !== 'undefined' && process.env.HOOKI_MODE === 'cloud'

// Root index route
// - Cloud mode: Show marketing landing page (TODO: implement)
// - Self-hosted: Redirect to /app dashboard
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // In non-cloud mode, redirect to dashboard
    if (!isCloudMode) {
      throw redirect({ to: '/app' })
    }
  },
  component: LandingPage,
})
