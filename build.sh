#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing pnpm..."
npm install -g pnpm@10

echo "==> Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "==> Building api-server..."
pnpm --filter @workspace/api-server run build

echo "==> Build complete."
