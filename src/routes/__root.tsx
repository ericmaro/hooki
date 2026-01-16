import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env'

const getContext = createServerFn({ method: "GET" }).handler(async () => {
  return {
    isCloud: env.HOOKI_MODE === 'cloud'
  }
})


export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  isCloud: boolean
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Hooki',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  beforeLoad: async () => {
    const { isCloud } = await getContext()
    return { isCloud }
  },
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
          <a href="/app" className="text-primary hover:underline">Go back home</a>
        </div>
      </div>
    )
  }
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
