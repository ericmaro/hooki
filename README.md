# Hooki

A lightweight webhook proxy that routes inbound HTTP requests to multiple outbound destinations with a visual flow editor and real-time telemetry.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

## Features

- 🎨 **Visual Flow Editor** — Design webhook routing using a drag-and-drop React Flow canvas
- 🔀 **Multi-destination Routing** — Proxy a single inbound request to multiple outbound webhooks
- 📊 **Real-time Telemetry** — Monitor request/response logs with replay capabilities
- 🔐 **HMAC Signature Verification** — Secure your inbound webhooks with signature validation
- 🏢 **Organization Support** — Multi-tenant project organization
- 🚀 **Self-hosted or Cloud** — Run on your own infrastructure or use the managed version

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/ericmaro/hooki.git
cd hooki

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your database and Redis URLs

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

Open [http://localhost:5004](http://localhost:5004)

## Environment Variables

| Variable               | Description                                             | Default                 |
| ---------------------- | ------------------------------------------------------- | ----------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                            | Required                |
| `REDIS_URL`            | Redis connection string                                 | Required                |
| `BETTER_AUTH_SECRET`   | 32+ character secret for auth                           | Required                |
| `BETTER_AUTH_URL`      | Base URL for auth callbacks                             | `http://localhost:5004` |
| `HOOKI_MODE`           | `self-hosted` or `cloud`                                | `self-hosted`           |
| `HOOKI_ADMIN_EMAIL`    | Optional self-hosted admin email enforced on startup    | Not set                 |
| `HOOKI_ADMIN_PASSWORD` | Optional self-hosted admin password enforced on startup | Not set                 |
| `HOOKI_ADMIN_NAME`     | Optional self-hosted admin display name                 | `Admin` for bootstrap   |

> **Note:** In `self-hosted` mode, only one user account can be created. The first signup becomes the admin.

### Self-Hosted Admin Recovery

For self-hosted installs, set `HOOKI_ADMIN_EMAIL` and `HOOKI_ADMIN_PASSWORD` to create the first user automatically or recover access to the existing single user. When either value is present, Hooki treats the provided values as the source of truth on every restart. Remove the variables after recovery if you want to manage credentials only through the app.

If no users exist yet, both `HOOKI_ADMIN_EMAIL` and `HOOKI_ADMIN_PASSWORD` are required. If one self-hosted user already exists, startup updates only the provided fields and revokes existing sessions when the email or password changes.

## Usage

1. **Create a Project** — Organize your flows into projects
2. **Create a Flow** — Define a new webhook routing flow
3. **Configure Inbound Route** — Set the path that receives incoming webhooks
4. **Add Outbound Destinations** — Connect to your target webhook URLs
5. **Save & Test** — Your flow is ready to proxy requests

### Webhook URL Format

```
POST https://your-domain.com/api/webhook/{flowId}
# or with custom paths
POST https://your-domain.com/api/webhook/{custom-path}
```

## Tech Stack

- [TanStack Start](https://tanstack.com/start) — Full-stack React framework
- [React Flow](https://reactflow.dev/) — Visual node-based editor
- [Better Auth](https://better-auth.com/) — Authentication
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe database access
- [BullMQ](https://bullmq.io/) — Background job processing
- [shadcn/ui](https://ui.shadcn.com/) — UI components

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Run production server
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
pnpm lint         # Run ESLint
pnpm test         # Run tests
```

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

> **Note:** Direct commits to `main` are disabled. All changes require a PR.

## License

MIT — see [LICENSE](LICENSE) for details.
