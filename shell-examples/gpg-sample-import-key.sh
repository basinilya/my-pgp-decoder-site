#!/bin/bash

set -euo pipefail

INPUT_FILE="sample-secret-key.asc"

if ! command -v gpg >/dev/null 2>&1; then
  echo "Error: gpg is not installed or not in PATH." >&2
  exit 1
fi

if [ ! -f "${INPUT_FILE}" ]; then
  echo "Error: input file not found: ${INPUT_FILE}" >&2
  echo "Run ./gpg-sample-export-key.sh first." >&2
  exit 1
fi

gpg \
  --batch \
  --yes \
  --import "${INPUT_FILE}"

echo "Imported secret key from ${INPUT_FILE}"