#!/usr/bin/env bash
set -e
REPO_URL="$1"
TARGET_DIR="$2"

git clone "$REPO_URL" "$TARGET_DIR"
