import { createFileRoute, redirect } from '@tanstack/react-router'

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

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-xl">hooki</div>
          <nav className="flex items-center gap-6">
            <a href="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </a>
            <a href="/login" className="text-muted-foreground hover:text-foreground">
              Login
            </a>
            <a
              href="/app"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Webhook Proxy Made Simple
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Route, transform, and monitor your webhooks with a visual flow editor.
            Built for developers who value simplicity.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/app"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-lg"
            >
              Start Free
            </a>
            <a
              href="https://github.com/yourorg/hooki"
              className="border border-border px-6 py-3 rounded-lg font-medium text-lg hover:bg-accent"
            >
              View on GitHub
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-lg mb-2">Visual Flow Editor</h3>
              <p className="text-muted-foreground">
                Design webhook flows with drag-and-drop. No code required.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-lg mb-2">Real-time Logs</h3>
              <p className="text-muted-foreground">
                Monitor every request with detailed logs and replay capability.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-lg mb-2">Security Built-in</h3>
              <p className="text-muted-foreground">
                HMAC signatures, rate limiting, and IP whitelisting out of the box.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          © 2024 Hooki. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
