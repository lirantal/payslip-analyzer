#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec op run --env-file="$SCRIPT_DIR/.env" -- npx --prefix "$SCRIPT_DIR" tsx "$SCRIPT_DIR/analyze.ts" "$@"
