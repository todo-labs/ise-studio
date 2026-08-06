#!/usr/bin/env bash
set -euo pipefail

# Start the Vite app separately before running this smoke flow.
# Usage: BASE_URL=http://127.0.0.1:5173 ./scripts/playwright-smoke.sh
BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
ARTIFACT_DIR="${PWD}/output/playwright"
export TMPDIR="${TMPDIR:-${PWD}/.tmp}"
mkdir -p "$TMPDIR"
mkdir -p "$ARTIFACT_DIR"

exec bun run scripts/playwright-smoke.mjs
