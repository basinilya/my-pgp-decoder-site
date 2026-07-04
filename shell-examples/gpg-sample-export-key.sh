#!/bin/bash

set -euo pipefail

KEY_EMAIL="sample.user@example.com"
OUTPUT_FILE="sample-secret-key.asc"
PASSPHRASE="sample-passphrase"

if ! command -v gpg >/dev/null 2>&1; then
  echo "Error: gpg is not installed or not in PATH." >&2
  exit 1
fi

# Ensure the secret key exists locally before exporting.
if ! gpg --list-secret-keys --with-colons "${KEY_EMAIL}" >/dev/null 2>&1; then
  echo "Error: secret key for ${KEY_EMAIL} not found." >&2
  echo "Run ./gpg-sample-keypair-generate.sh first." >&2
  exit 1
fi

gpg \
  --batch \
  --yes \
  --pinentry-mode loopback \
  --passphrase-file <(printf '%s' "${PASSPHRASE}") \
  --armor \
  --output "${OUTPUT_FILE}" \
  --export-secret-keys "${KEY_EMAIL}"

echo "Exported secret key for ${KEY_EMAIL} -> ${OUTPUT_FILE}"