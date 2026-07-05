# PGP URL Decoder Test Project

**Try it out:** https://basinilya.github.io/my-pgp-decoder-site/

This repository contains a static web application and helper scripts for working with encrypted messages embedded directly in URLs.

The main flow is:

1. Encrypt plaintext with OpenPGP for a recipient key.
2. URL-safe base64 encode the ciphertext.
3. Put the payload in `?urlsafe-pgp-message=`.
4. Open the URL in the web app and decrypt in-browser using the recipient private key.

The web app is intentionally static and can be deployed on GitHub Pages.

## Repository Layout

- `web/`
  - Vite-based web app.
  - Includes local package `my-message-utils` for non-UI logic.
- `python/`
  - Python helper and example for URL generation using GPG.
- `shell-examples/`
  - Sample GPG shell and PowerShell scripts.
- Root batch wrappers
  - `web-run-dev.bat`, `web-run-build.bat`, `web-run-test.bat`, `web-deploy.bat`, `web-dev-decrypt.bat`.

## Features

- Decrypts `urlsafe-pgp-message` directly in browser.
- Private key manager with upload or paste support.
- Passphrase detection on import.
- Protected keys are unlocked during import and stored unlocked in local storage.
- Stored keys can be removed with delete confirmation.
- About panel with quick-start script code block.
- Console mirror panel that HTML-escapes console output.
- Status toast notifications (neutral grey and alert pink).
- Panels auto-scroll and focus when opened.

## Prerequisites

### For web app

- Node.js 18+ (current setup tested with modern Node versions).
- npm.

### For GPG workflows

- GnuPG (`gpg`) available in PATH.
- Bash for shell scripts.

### For Python helper scripts

- Python 3.9+.
- GnuPG in PATH for the Python process.

## Web App Setup

From repository root:

```powershell
cd web
npm install
```

## Run, Build, Test

### Using root wrappers (Windows)

```powershell
.\web-run-dev.bat
.\web-run-build.bat
.\web-run-test.bat
```

### Direct npm commands

```powershell
cd web
npm run dev
npm run build
npm test
```

## Deploy to GitHub Pages

The web project includes:

- `npm run deploy` -> `vite build && gh-pages -d dist`

From repository root:

```powershell
.\web-deploy.bat
```

Notes:

- A `gh-pages` branch should exist.
- A valid `origin` remote and credentials are required.

## URL Payload Format

The app expects an optional query parameter:

- `urlsafe-pgp-message`

Payload handling in app:

- URL-safe base64 binary ciphertext is supported.
- URL-safe base64 armored ciphertext is supported.
- Armored message text is supported when provided directly.

## Shell Quick Start Script

Primary quick-start script:

- `web/src/assets/quick-start.sh`

What it does:

1. Replaces any prior test key in local keyring.
2. Generates a test keypair with params passed to GPG via STDIN.
3. Encrypts a test message via STDIN.
4. Base64url-encodes ciphertext.
5. Prints:
   - PGP private key block.
   - passphrase.
   - URL with payload.
   - browser instructions.

No message temp file is required for encryption path.

## Shell Examples

Under `shell-examples/`:

- `gpg-sample-keypair-generate.sh`
- `gpg-sample-encrypt.sh`
- `gpg-sample-decrypt.sh`
- `gpg-sample-export-key.sh`
- `gpg-sample-export-cert.sh`
- `gpg-sample-import-key.sh`
- `gpg-sample-import-cert.sh`
- `web-dev-decrypt.ps1`

Useful launcher:

```powershell
.\web-dev-decrypt.bat
```

This opens a URL for localhost dev mode by encoding `shell-examples/sample-message.txt.gpg` into `urlsafe-pgp-message`.

## Python Helper

File: `python/sms_encrypt_helper.py`

`SmsEncryptHelper.encrypt`:

- Inputs:
  - `text`
  - `pgp_recipient` (default `quick-start@example.local`)
  - `base_url` (default `http://localhost:5173`)
- Behavior:
  - Runs `gpg --encrypt`.
  - URL-safe base64 encodes ciphertext.
  - Returns URL object (`urllib.parse.ParseResult`) with `urlsafe-pgp-message` query param.

Example script:

- `python/sms_encrypt_example.py`

It:

1. Runs `web/src/assets/quick-start.sh` to prepare key material.
2. Calls `SmsEncryptHelper.encrypt(...)` using matching defaults.
3. Prints resulting URL.

## Running Python Example in WSL

```bash
cd /mnt/c/SHARE/test-project/python
python3 sms_encrypt_example.py
```

## Running Python Example in Windows with Git-for-Windows GPG

If `gpg` is unavailable in PATH for Windows Python, prefix PATH as below:

```powershell
$env:Path = 'C:\Program Files\Git\mingw64\bin;C:\Program Files\Git\usr\bin;' + $env:Path
cd C:\SHARE\test-project\python
python sms_encrypt_example.py
```

## Security Notes

- This is a demo/test project, not a hardened production vault.
- Key material is stored in browser local storage.
- Current behavior unlocks protected keys at import and stores the unlocked armored private key.
- Treat browser profile storage as sensitive.
- Anyone with local access to that browser profile can potentially access key material.

## Troubleshooting

### Dev server launched in wrong folder

If you run `npm run dev` at repo root, npm fails because `package.json` is in `web/`.

Use:

```powershell
.\web-run-dev.bat
```

or:

```powershell
npm --prefix web run dev
```

### Git not found in PowerShell

If `git` is unavailable in PowerShell, restart terminal/VS Code or add Git path to PATH.

Typical path:

- `C:\Program Files\Git\cmd`

### GitHub Pages asset path issues

This project uses Vite config with relative base (`./`) so built assets resolve correctly under repo subpaths.

### Vite warning about importing from `public`

Raw-imported script now lives under `src/assets`, not `public`.

## Development Notes

- Local package `web/packages/my-message-utils` contains core parsing, storage, key matching, and decryption logic.
- UI behavior is in `web/src/main.js`.
- Styles are in `web/src/styles.css`.
- Keep validations fast:
  - `npm test` when module logic changes.
  - `npm run build` after UI and integration changes.

## License

Project currently contains default npm metadata (`ISC` in `web/package.json`).
Adjust licensing and notices as needed for your distribution model.
