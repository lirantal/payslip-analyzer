#!/bin/bash

# CORS Update Script for payslip-analyzer-bucket Bucket
# Usage: ./scripts/update-cors.sh [domain1] [domain2] ...
# Example: ./scripts/update-cors.sh "https://myapp.com" "https://www.myapp.com"
#
# Wrangler does not resolve op:// in .env; we inject first (see setup-r2.sh).

set -e
cd "$(dirname "$0")/.."

echo "🌐 Updating CORS policy for payslip-analyzer-bucket bucket..."

if [ ! -f .env ]; then
    echo "❌ .env not found in backend/."
    exit 1
fi

INJECTED_ENV_FILE=$(mktemp)
trap 'rm -f "$INJECTED_ENV_FILE" cors.json' EXIT
USE_INJECTED_ENV=false

# Global --env-file before "r2 ..." is parsed as multiple env paths; pass --env-file last.
run_wrangler() {
    if [ "$USE_INJECTED_ENV" = true ]; then
        pnpm exec wrangler "$@" --env-file "$INJECTED_ENV_FILE"
    else
        pnpm exec wrangler "$@"
    fi
}

if command -v op &> /dev/null; then
    op inject -i .env -o "$INJECTED_ENV_FILE"
    USE_INJECTED_ENV=true
else
    echo "⚠️  1Password CLI (op) not found; using default Wrangler .env loading."
fi

# Default to wildcard if no domains provided
if [ $# -eq 0 ]; then
    ALLOWED_ORIGINS='["*"]'
    echo "⚠️  No domains specified, using wildcard (*) - not recommended for production!"
else
    # Build array of domains
    ALLOWED_ORIGINS="["
    for domain in "$@"; do
        ALLOWED_ORIGINS="$ALLOWED_ORIGINS\"$domain\","
    done
    # Remove trailing comma and close array
    ALLOWED_ORIGINS="${ALLOWED_ORIGINS%,}]"
    echo "✅ Restricting to domains: $ALLOWED_ORIGINS"
fi

# Create CORS configuration
cat > cors.json << EOF
{
  "rules": [
    {
      "allowed": {
        "methods": ["PUT", "GET", "POST", "DELETE"],
        "origins": $ALLOWED_ORIGINS,
        "headers": [
          "content-type",
          "x-amz-meta-original-filename",
          "x-amz-meta-uploaded-at",
          "x-amz-meta-uploaded-by",
          "x-amz-meta-uploader-id",
          "x-amz-meta-uploader-type",
          "x-amz-meta-file-id",
          "x-amz-meta-link-id"
        ]
      },
      "exposeHeaders": ["ETag"],
      "maxAgeSeconds": 3000
    }
  ]
}
EOF

echo "📝 CORS configuration:"
cat cors.json

# Apply CORS policy
echo "🚀 Applying CORS policy..."
if run_wrangler r2 bucket cors set payslip-analyzer-bucket --file=cors.json; then
    echo "✅ CORS policy updated successfully!"
else
    echo "❌ Failed to update CORS policy"
fi

echo ""
echo "💡 To update CORS again, run:"
echo "   ./scripts/update-cors.sh \"https://yourdomain.com\" \"https://www.yourdomain.com\""
