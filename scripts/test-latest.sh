#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v node >/dev/null 2>&1 || { echo "[error] Node.js est requis / Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "[error] npm est requis / npm is required"; exit 1; }

REQUIRED_NODE_MAJOR=20
REQUIRED_NPM_MAJOR=10

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
NPM_MAJOR=$(npm -v | cut -d. -f1)

if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "[error] Node.js >= ${REQUIRED_NODE_MAJOR} est requis (version actuelle: $(node -v))"
  echo "[error] Node.js >= ${REQUIRED_NODE_MAJOR} is required (current: $(node -v))"
  exit 1
fi

if [ "$NPM_MAJOR" -lt "$REQUIRED_NPM_MAJOR" ]; then
  echo "[error] npm >= ${REQUIRED_NPM_MAJOR} est requis (version actuelle: $(npm -v))"
  echo "[error] npm >= ${REQUIRED_NPM_MAJOR} is required (current: $(npm -v))"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[setup] installing dependencies via npm ci"
  npm ci
fi

echo "[tests] running full Vitest suite (unit + contract + e2e)"
npm run test:full

echo "[done] all tests for the latest app version passed"
