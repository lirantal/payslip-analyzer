#!/bin/bash
# Deploy frontend to Cloudflare Pages
#
# This script:
# 1. Resolves secrets from 1Password via `op run` using .env.production
# 2. Builds the Nuxt app for Cloudflare Pages
# 3. Deploys to Cloudflare Pages using wrangler
#
# Prerequisites:
#   - 1Password CLI (`op`) installed and authenticated
#   - .env.production with op:// secret references
#   - Cloudflare Pages project exists (name = wrangler.toml `name`). First time only:
#       pnpm exec wrangler pages project create "$(sed -n 's/^name = "\([^"]*\)".*/\1/p' wrangler.toml | head -1)" --production-branch=main
#   - Production URL (<name>.pages.dev) only updates when the deploy branch matches that
#     production branch. Wrangler otherwise uses your current git branch (e.g. master) and
#     you get preview URLs only. Override with PAGES_PRODUCTION_BRANCH if needed.
#
# Usage:
#   pnpm run deploy
#   # or directly:
#   ./scripts/deploy.sh

set -e

# Change to frontend directory (script location's parent)
cd "$(dirname "$0")/.."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "Error: .env.production not found"
    echo "Create it with op:// secret references, e.g.:"
    echo '  NUXT_PUBLIC_API_BASE_URL=""'
    echo '  BACKEND_URL="op://Development/backend-worker/url"'
    exit 1
fi

# Verify op CLI is available
if ! command -v op &> /dev/null; then
    echo "Error: 1Password CLI (op) is not installed or not in PATH"
    exit 1
fi

echo "Building for production (secrets resolved via 1Password)..."
echo ""

# Build the app with secrets resolved from 1Password
op run --env-file=.env.production -- pnpm run build

echo ""
# Pages project name must match Cloudflare Pages project (see wrangler.toml `name`)
PAGES_PROJECT_NAME="$(sed -n 's/^name = "\([^"]*\)".*/\1/p' wrangler.toml | head -1)"
if [ -z "$PAGES_PROJECT_NAME" ]; then
  echo "Error: could not read name from wrangler.toml"
  exit 1
fi

# Match Pages "production branch" or root *.pages.dev stays on "Nothing is here yet"
PAGES_PRODUCTION_BRANCH="${PAGES_PRODUCTION_BRANCH:-main}"

echo "Deploying to Cloudflare Pages (project: ${PAGES_PROJECT_NAME}, branch: ${PAGES_PRODUCTION_BRANCH})..."
pnpm exec wrangler pages deploy dist \
  --project-name="${PAGES_PROJECT_NAME}" \
  --branch="${PAGES_PRODUCTION_BRANCH}" \
  --commit-dirty=true

echo ""
echo "Deployment complete!"
echo ""
echo "Test the deployment with:"
echo "  pnpm run test:deployment"
