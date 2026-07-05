from __future__ import annotations

import subprocess
from pathlib import Path

from sms_encrypt_helper import SmsEncryptHelper


MESSAGE = "Hello from PGP URL Decoder! If you can read this, decryption worked."
PGP_RECIPIENT = "quick-start@example.local"
BASE_URL = "http://localhost:5173"


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    quick_start_script = repo_root / "web" / "src" / "assets" / "quick-start.sh"

    if not quick_start_script.exists():
        raise FileNotFoundError(f"quick-start.sh not found: {quick_start_script}")

    # Prepare key material in the current GPG database.
    subprocess.run(["bash", str(quick_start_script)], check=True)

    url = SmsEncryptHelper.encrypt(MESSAGE, PGP_RECIPIENT, BASE_URL)
    print(url.geturl())


if __name__ == "__main__":
    main()
