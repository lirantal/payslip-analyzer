#!/bin/bash

# R2 Setup Script for payslip-analyzer-bucket Bucket
# This script helps set up the R2 bucket and CORS policy for file uploads
#
# Wrangler reads .env for CLOUDFLARE_ACCOUNT_ID but does not resolve op:// references.
# We inject secrets first and pass --env-file so the API gets a real account ID.

set -e
cd "$(dirname "$0")/.."

echo "🚀 Setting up R2 payslip-analyzer-bucket Bucket..."

if [ ! -f .env ]; then
    echo "❌ .env not found in backend/. Run from repo or create .env."
    exit 1
fi

INJECTED_ENV_FILE=$(mktemp)
trap 'rm -f "$INJECTED_ENV_FILE" cors.json' EXIT
USE_INJECTED_ENV=false

# Wrangler's global --env-file is yargs array:true and greedily eats every following token if it
# comes before the subcommand. Pass --env-file last so "r2 bucket ..." is not swallowed.
run_wrangler() {
    if [ "$USE_INJECTED_ENV" = true ]; then
        pnpm exec wrangler "$@" --env-file "$INJECTED_ENV_FILE"
    else
        pnpm exec wrangler "$@"
    fi
}

if command -v op &> /dev/null; then
    echo "Resolving Cloudflare account ID from 1Password (.env)..."
    op inject -i .env -o "$INJECTED_ENV_FILE"
    USE_INJECTED_ENV=true
else
    echo "⚠️  1Password CLI (op) not found; using default Wrangler .env loading (op:// will break API calls)."
fi

# Create the payslip-analyzer-bucket bucket
echo "📦 Creating payslip-analyzer-bucket bucket..."
run_wrangler r2 bucket create payslip-analyzer-bucket || true

if run_wrangler r2 bucket list 2>/dev/null | grep -q 'payslip-analyzer-bucket'; then
    echo "✅ payslip-analyzer-bucket exists (created now or already present)."
else
    echo "⚠️  Bucket creation may have failed. Common causes:"
    echo "   - R2 is not enabled in your Cloudflare account"
    echo "   - CLOUDFLARE_ACCOUNT_ID in .env is still op://... (run with op inject or: pnpm sync-env)"
    echo "   - Run 'pnpm exec wrangler login' if not authenticated"
    echo ""
    echo "Please enable R2 in the Cloudflare Dashboard and try again."
fi

# Create CORS policy file
echo "🔧 Creating CORS policy..."
cat > cors.json << EOF
{
  "rules": [
    {
      "allowed": {
        "methods": ["PUT", "GET", "POST","DELETE"],
        "origins": ["*"],
        "headers": ["content-type",
          "x-amz-meta-original-filename",
          "x-amz-meta-uploaded-at",
          "x-amz-meta-uploaded-by"
        ]
      },
      "exposeHeaders": ["ETag"],
      "maxAgeSeconds": 3000
    }
  ]
}
EOF

# Apply CORS policy
echo "🌐 Applying CORS policy..."
if run_wrangler r2 bucket cors set payslip-analyzer-bucket --file=cors.json; then
    echo "✅ CORS policy applied successfully!"
else
    echo "❌ Failed to apply CORS policy"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Create R2 API token in Cloudflare Dashboard"
echo "2. Add environment variables to .dev.vars file:"
echo "   - CLOUDFLARE_ACCOUNT_ID"
echo "   - R2_ACCESS_KEY_ID" 
echo "   - R2_SECRET_ACCESS_KEY"
echo "3. Run 'npm run dev' to test locally"
echo "4. Run 'npm run deploy' to deploy your application"
echo ""
echo "📖 See docs/features/r2-uploads.md for detailed instructions"
