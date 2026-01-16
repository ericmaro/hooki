import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/settings/api-keys')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/settings/api-keys"!</div>
}
