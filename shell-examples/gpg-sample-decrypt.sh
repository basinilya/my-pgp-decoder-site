#!/bin/bash

set -euo pipefail

INPUT_FILE="sample-message.txt.gpg"
OUTPUT_FILE="sample-message.txt.gpg.decrypted"
PASSPHRASE="sample-passphrase"

if ! command -v gpg >/dev/null 2>&1; then
  echo "Error: gpg is not installed or not in PATH." >&2
  exit 1
fi

if [ ! -f "${INPUT_FILE}" ]; then
  echo "Error: input file not found: ${INPUT_FILE}" >&2
  exit 1
fi

gpg \
  --batch \
  --yes \
  --pinentry-mode loopback \
  --passphrase-file <(printf '%s' "${PASSPHRASE}") \
  --output "${OUTPUT_FILE}" \
  --decrypt "${INPUT_FILE}"

echo "Decrypted ${INPUT_FILE} -> ${OUTPUT_FILE}"