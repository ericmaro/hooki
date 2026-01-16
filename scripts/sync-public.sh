#!/bin/bash
set -e

echo "🔄 Syncing to public repo..."

# Ensure we're on main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Must be on main branch"
  exit 1
fi

# Create a temporary branch for the public version
git checkout -b public-release

# Remove private code
echo "🗑️  Removing private code..."
rm -rf src/routes/app/settings

# Replace index.tsx with public version
cat > src/routes/index.tsx << 'EOF'
import { createFileRoute, redirect } from '@tanstack/react-router'

// Root route - redirects to dashboard
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/app' })
  },
})
EOF

# Remove any _cloud folders  
find . -type d -name "_cloud" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "cloud-private" -exec rm -rf {} + 2>/dev/null || true

# Commit changes
git add -A
git commit -m "chore: prepare public release" --allow-empty

# Push to public
echo "🚀 Pushing to public repo..."
git push public public-release:main --force

# Switch back to main and clean up
git checkout main
git branch -D public-release

echo "✅ Synced to public repo!"
echo "   View at: https://github.com/ericmaro/hooki"
