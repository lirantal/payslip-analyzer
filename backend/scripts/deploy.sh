#!/bin/bash
# Deploy backend to Cloudflare Workers
#
# This script:
# 1. Resolves secrets from 1Password via `op run` / `op inject` using .env.production
# 2. Sets Cloudflare Worker secrets using wrangler secret bulk
# 3. Deploys the worker using wrangler
#
# Prerequisites:
#   - 1Password CLI (`op`) installed and authenticated
#   - .env.production with op:// secret references
#
# Usage:
#   pnpm run deploy
#   # or directly:
#   ./scripts/deploy.sh
#
# Options:
#   --secrets-only    Only update secrets, don't deploy
#   --deploy-only     Only deploy, don't update secrets

set -e

# Change to backend directory (script location's parent)
cd "$(dirname "$0")/.."

# Parse arguments
SECRETS_ONLY=false
DEPLOY_ONLY=false

for arg in "$@"; do
  case $arg in
    --secrets-only)
      SECRETS_ONLY=true
      shift
      ;;
    --deploy-only)
      DEPLOY_ONLY=true
      shift
      ;;
  esac
done

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "Error: .env.production not found"
    echo ""
    echo "Create it with op:// secret references, e.g.:"
    echo "  DATABASE_URL=op://Production/neon-postgres/connection-string"
    echo "  BETTER_AUTH_SECRET=op://Production/better-auth/secret"
    echo "  BETTER_AUTH_URL=https://yourdomain.com"
    echo "  GEMINI_API_KEY=op://Production/gemini/api-key"
    echo ""
    echo "See .env.production.example for a template."
    exit 1
fi

# Verify op CLI is available
if ! command -v op &> /dev/null; then
    echo "Error: 1Password CLI (op) is not installed or not in PATH"
    exit 1
fi

# Required secrets (checked after resolution)
REQUIRED_SECRETS=(
    "DATABASE_URL"
    "BETTER_AUTH_SECRET"
    "BETTER_AUTH_URL"
    "GEMINI_API_KEY"
)

# Resolve op:// references into a temporary file for wrangler secret bulk
RESOLVED_ENV=$(mktemp)
trap "rm -f $RESOLVED_ENV" EXIT

echo "Resolving secrets from 1Password..."
op inject -f -i .env.production -o "$RESOLVED_ENV"

# Load resolved values for validation
set -a
source "$RESOLVED_ENV"
set +a

# Update secrets if not deploy-only
if [ "$DEPLOY_ONLY" = false ]; then
    echo ""
    echo "Validating required secrets..."
    
    missing_secrets=()
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if [ -z "${!secret}" ]; then
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -gt 0 ]; then
        echo "Error: Missing required secrets:"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        exit 1
    fi
    
    echo "✅ All required secrets present"
    echo ""
    echo "Uploading secrets to Cloudflare Workers..."
    
    pnpm exec wrangler secret bulk "$RESOLVED_ENV"
    
    echo ""
    echo "✅ Secrets uploaded"
fi

# Deploy if not secrets-only
if [ "$SECRETS_ONLY" = false ]; then
    echo ""
    echo "Deploying to Cloudflare Workers..."
    pnpm exec wrangler deploy --minify
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "Test the deployment with:"
    echo "  curl https://payslip-analyzer.<account>.workers.dev/"
fi

echo ""
echo "Done!"
