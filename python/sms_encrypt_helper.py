"""Helpers for generating encrypted URL payloads for the web decoder."""

from __future__ import annotations

import base64
import subprocess
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


class SmsEncryptHelper:
    @staticmethod
    def encrypt(text: str, pgp_recipient: str, base_url: str):
        """Encrypt text for a recipient and return a URL object with the payload."""
        if not text:
            raise ValueError("text must not be empty")
        if not pgp_recipient:
            raise ValueError("pgp_recipient must not be empty")
        if not base_url:
            raise ValueError("base_url must not be empty")

        process = subprocess.run(
            [
                "gpg",
                "--batch",
                "--yes",
                "--trust-model",
                "always",
                "--recipient",
                pgp_recipient,
                "--encrypt",
            ],
            input=text.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        if process.returncode != 0:
            raise RuntimeError(process.stderr.decode("utf-8", errors="replace").strip())

        encoded_message = base64.urlsafe_b64encode(process.stdout).decode("ascii").rstrip("=")

        parsed = urlparse(base_url)
        query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query_params["urlsafe-pgp-message"] = encoded_message

        return parsed._replace(query=urlencode(query_params))
