#!/bin/bash

set -euo pipefail

KEY_EMAIL="sample.user@example.com"
OUTPUT_FILE="sample-public-cert.asc"

if ! command -v gpg >/dev/null 2>&1; then
  echo "Error: gpg is not installed or not in PATH." >&2
  exit 1
fi

# Ensure the public key exists locally before exporting.
if ! gpg --list-keys --with-colons "${KEY_EMAIL}" >/dev/null 2>&1; then
  echo "Error: public key for ${KEY_EMAIL} not found." >&2
  echo "Run ./gpg-sample-keypair-generate.sh first." >&2
  exit 1
fi

gpg \
  --batch \
  --yes \
  --armor \
  --output "${OUTPUT_FILE}" \
  --export "${KEY_EMAIL}"

echo "Exported public cert for ${KEY_EMAIL} -> ${OUTPUT_FILE}"