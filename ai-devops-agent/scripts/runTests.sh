#!/usr/bin/env bash
set -e
PROJECT_DIR="$1"

cd "$PROJECT_DIR"
if [ -f package.json ]; then
  npm test || true
fi
