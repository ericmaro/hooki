# Hookly

A webhook proxy application that routes inbound HTTP requests to outbound webhooks with a visual flow editor.

## Features

- **Visual Flow Editor** - Design webhook flows using a drag-and-drop React Flow canvas
- **Inbound/Outbound Routing** - Define HTTP endpoints that proxy to multiple webhook destinations
- **Flow Management** - Create, edit, and organize multiple flow configurations
- **HTTP Logging** - Track all requests through your flows (coming soon)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server (port 5004)
pnpm dev
```

Open [http://localhost:5004](http://localhost:5004) in your browser.

## Usage

1. **Create a Flow** - Click the "+" button in the sidebar or the empty state CTA
2. **Configure Inbound Route** - Set the path that will receive incoming webhooks
3. **Add Outbound Destinations** - Connect to your target webhook URLs
4. **Save & Deploy** - Your flow is ready to proxy requests

## Tech Stack

- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [React Flow](https://reactflow.dev/) - Node-based flow editor
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components

## Project Structure

```
src/
├── components/
│   ├── app-layout.tsx      # Main shell layout
│   ├── app-sidebar.tsx     # Left navigation sidebar
│   ├── empty-state.tsx     # "Create your first flow" CTA
│   ├── flow-card.tsx       # Flow summary card
│   ├── flow-editor.tsx     # React Flow canvas
│   ├── flow-modal.tsx      # Create/edit flow dialog
│   └── nodes/
│       ├── inbound-node.tsx   # HTTP inbound node
│       └── outbound-node.tsx  # Webhook outbound node
├── routes/
│   ├── __root.tsx          # Root layout
│   ├── index.tsx           # Dashboard page
│   └── flow.$flowId.tsx    # Flow editor page
└── styles.css              # Global styles
```

## License

MIT
