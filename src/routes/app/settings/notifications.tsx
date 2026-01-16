import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/settings/notifications')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/settings/notifications"!</div>
}
