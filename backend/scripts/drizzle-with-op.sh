#!/usr/bin/env bash
# Run drizzle-kit with env vars resolved from .env.
# If 1Password CLI (`op`) is available, runs `op inject` first so op:// references work.
# Usage: ./scripts/drizzle-with-op.sh <generate|migrate|push|...>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "❌ .env not found in $ROOT" >&2
  exit 1
fi

BIN="$ROOT/node_modules/drizzle-kit/bin.cjs"
if [[ ! -f "$BIN" ]]; then
  echo "❌ drizzle-kit not found at $BIN (run pnpm install)" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <drizzle-kit subcommand> [args...]" >&2
  echo "Example: $0 migrate" >&2
  exit 1
fi

if command -v op >/dev/null 2>&1; then
  # mktemp creates an empty file; op inject -o refuses to overwrite without a prompt.
  # Remove the path first so inject can write without interaction.
  TMP="$(mktemp)"
  cleanup() { rm -f "$TMP"; }
  trap cleanup EXIT
  rm -f "$TMP"
  op inject -i .env -o "$TMP"
  node --env-file="$TMP" "$BIN" "$@"
else
  node --env-file=.env "$BIN" "$@"
fi
