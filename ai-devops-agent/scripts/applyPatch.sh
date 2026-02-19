#!/usr/bin/env bash
set -e
PATCH_FILE="$1"

git apply "$PATCH_FILE"
