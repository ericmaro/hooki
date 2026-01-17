import { Link } from '@tanstack/react-router'
import { ArrowRight, Webhook, Zap, Shield } from 'lucide-react'

export function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-20">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                    {/* Logo */}
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                        <Webhook className="w-10 h-10 text-primary" />
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Hooki
                    </h1>

                    <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                        A lightweight webhook proxy with visual flow editor and real-time telemetry.
                        Route, transform, and monitor your webhooks with ease.
                    </p>

                    <div className="flex gap-4">
                        <Link
                            to="/app"
                            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <a
                            href="https://github.com/ericmaro/hooki"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-border bg-background font-medium hover:bg-muted transition-colors"
                        >
                            View on GitHub
                        </a>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
                    <div className="p-6 rounded-xl bg-card border border-border">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Webhook className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Visual Flow Editor</h3>
                        <p className="text-muted-foreground text-sm">
                            Design webhook flows visually with an intuitive drag-and-drop canvas.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl bg-card border border-border">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Real-time Telemetry</h3>
                        <p className="text-muted-foreground text-sm">
                            Monitor webhook traffic in real-time with detailed logs and replay.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl bg-card border border-border">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Self-Hosted</h3>
                        <p className="text-muted-foreground text-sm">
                            Deploy on your own infrastructure. Full control, no vendor lock-in.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
