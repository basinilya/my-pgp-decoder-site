#!/bin/bash

set -euo pipefail

# Generates a sample key pair without interactive prompts.
cat > gpg-keyparams.batch <<'EOF'
%echo Generating a sample OpenPGP key
Key-Type: RSA
Key-Length: 3072
Subkey-Type: RSA
Subkey-Length: 3072
Name-Real: Sample User
Name-Email: sample.user@example.com
Expire-Date: 1y
Passphrase: sample-passphrase
%commit
%echo Key generation complete
EOF

gpg --batch --pinentry-mode loopback --generate-key gpg-keyparams.batch

# Show the generated key in machine-readable format.
gpg --list-secret-keys --keyid-format LONG --with-colons "sample.user@example.com"