#!/bin/bash

set -euo pipefail

RECIPIENT_EMAIL="sample.user@example.com"
INPUT_FILE="sample-message.txt"
OUTPUT_FILE="${INPUT_FILE}.gpg"

if ! command -v gpg >/dev/null 2>&1; then
  echo "Error: gpg is not installed or not in PATH." >&2
  exit 1
fi

if [ ! -f "${INPUT_FILE}" ]; then
  echo "Error: input file not found: ${INPUT_FILE}" >&2
  exit 1
fi

# Ensure the recipient public key exists locally before encrypting.
if ! gpg --list-keys --with-colons "${RECIPIENT_EMAIL}" >/dev/null 2>&1; then
  echo "Error: public key for ${RECIPIENT_EMAIL} not found." >&2
  echo "Run ./gpg-sample-keypair-generate.sh first." >&2
  exit 1
fi

gpg \
  --batch \
  --yes \
  --trust-model always \
  --output "${OUTPUT_FILE}" \
  --recipient "${RECIPIENT_EMAIL}" \
  --encrypt "${INPUT_FILE}"

echo "Encrypted ${INPUT_FILE} -> ${OUTPUT_FILE}"