#!/bin/bash

set -euo pipefail

# ---------------------------------------------------------------------------
# quick-start.sh
# Generates (or replaces) a test GPG keypair and encrypts a test message,
# then prints the private key, passphrase, and a ready-to-open localhost URL.
# Nothing is written to disk.  Pipe all key material through GPG STDIN.
# ---------------------------------------------------------------------------

SEP=$(printf '=%.0s' {1..80})
KEY_EMAIL="quick-start@example.local"
KEY_NAME="Quick Start Test Key"
PASSPHRASE="quick-start-passphrase"
MESSAGE="Hello from PGP URL Decoder! If you can read this, decryption worked."
BASE_URL="http://localhost:5173"

if ! command -v gpg >/dev/null 2>&1; then
  echo "Error: gpg is not installed or not in PATH." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Remove any existing key with this email so re-runs stay clean.
# ---------------------------------------------------------------------------
EXISTING_FPR=$(gpg --batch --list-secret-keys --with-colons "${KEY_EMAIL}" 2>/dev/null \
  | awk -F: '/^fpr/ { print $10; exit }') || true

if [ -n "${EXISTING_FPR}" ]; then
  gpg --batch --yes --delete-secret-and-public-key "${EXISTING_FPR}" >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
# 2. Generate keypair — key parameters fed via STDIN, no batch file on disk.
# ---------------------------------------------------------------------------
gpg --batch --pinentry-mode loopback --generate-key - <<EOF
%echo Generating quick-start test key
Key-Type: RSA
Key-Length: 3072
Subkey-Type: RSA
Subkey-Length: 3072
Name-Real: ${KEY_NAME}
Name-Email: ${KEY_EMAIL}
Expire-Date: 1y
Passphrase: ${PASSPHRASE}
%commit
%echo Done
EOF

# ---------------------------------------------------------------------------
# 3. Export armored private key — passphrase supplied via process substitution.
# ---------------------------------------------------------------------------
PRIVATE_KEY=$(gpg \
  --batch --yes \
  --pinentry-mode loopback \
  --passphrase-file <(printf '%s' "${PASSPHRASE}") \
  --armor \
  --export-secret-keys "${KEY_EMAIL}")

# ---------------------------------------------------------------------------
# 4. Encrypt the test message via STDIN and base64url-encode in one pipeline.
#    No intermediate variable holds the ciphertext.
# ---------------------------------------------------------------------------
ENCODED=$(printf '%s' "${MESSAGE}" | gpg \
  --batch --yes \
  --trust-model always \
  --recipient "${KEY_EMAIL}" \
  --encrypt \
  | base64 | tr '+/' '-_' | tr -d '=\n')

URL="${BASE_URL}?urlsafe-pgp-message=${ENCODED}"

# ---------------------------------------------------------------------------
# 6. Print results.
# ---------------------------------------------------------------------------
echo "${SEP}"
printf '%s\n' "${PRIVATE_KEY}"
echo "${SEP}"
echo "Passphrase: ${PASSPHRASE}"
echo "${SEP}"
echo "URL: ${URL}"
echo "${SEP}"
echo "Open the URL above in your browser and copy the key and the passphrase"
echo "above into the Private Key Manager form on the page"
echo "${SEP}"
