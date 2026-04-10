#!/bin/bash
# sync-env.sh - Resolve op:// references in .env and sync to .dev.vars for Wrangler

if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

if ! command -v op &> /dev/null; then
  echo "❌ 1Password CLI (op) is not installed or not in PATH"
  echo "Falling back to plain copy..."
  cp .env .dev.vars
  echo "⚠️  Environment variables synced without secret resolution"
  exit 0
fi

echo "Resolving op:// references and syncing .env to .dev.vars..."
op inject -i .env -o .dev.vars
echo "✅ Environment variables resolved and synced"
