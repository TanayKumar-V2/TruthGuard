from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse, urlunparse


class UnsafeUrlError(ValueError):
    pass


BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
}
BLOCKED_SUFFIXES = (
    ".internal",
    ".local",
    ".localhost",
)
PROMPT_INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\bignore (all|any|the) previous instructions\b",
        r"\bsystem prompt\b",
        r"\byou are chatgpt\b",
        r"\byou are an ai assistant\b",
        r"\bdeveloper message\b",
        r"\btool call\b",
        r"<system>",
        r"\bfunction call\b",
    ]
]
ALLOWED_CONTENT_TYPES = (
    "text/html",
    "text/plain",
    "application/xhtml+xml",
)


def normalize_public_url(url: str, max_length: int = 2048) -> str:
    candidate = (url or "").strip()
    if not candidate:
        raise UnsafeUrlError("URL is empty.")
    if len(candidate) > max_length:
        raise UnsafeUrlError("URL exceeds the maximum allowed length.")

    parsed = urlparse(candidate)
    if parsed.scheme.lower() not in {"http", "https"}:
        raise UnsafeUrlError("Only http and https URLs are allowed.")
    if not parsed.netloc:
        raise UnsafeUrlError("URL is missing a host.")
    if parsed.username or parsed.password:
        raise UnsafeUrlError("Credentialed URLs are not allowed.")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise UnsafeUrlError("URL is missing a valid hostname.")
    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(BLOCKED_SUFFIXES):
        raise UnsafeUrlError("Local or internal hosts are not allowed.")

    _ensure_public_host(hostname)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", "", parsed.query, ""))


def _ensure_public_host(hostname: str) -> None:
    try:
        addresses = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise UnsafeUrlError(f"Could not resolve host '{hostname}'.") from exc

    for address in addresses:
        ip_text = address[4][0]
        ip = ipaddress.ip_address(ip_text)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise UnsafeUrlError("Resolved host points to a private or restricted network.")


def sanitize_external_text(text: str, max_chars: int) -> tuple[str, int]:
    cleaned_lines: list[str] = []
    removed_count = 0
    for raw_line in re.split(r"[\r\n]+", text or ""):
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            continue
        if any(pattern.search(line) for pattern in PROMPT_INJECTION_PATTERNS):
            removed_count += 1
            continue
        cleaned_lines.append(line)

    cleaned = " ".join(cleaned_lines)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:max_chars], removed_count


def sanitize_untrusted_text(text: str, max_chars: int) -> tuple[str, list[str]]:
    cleaned, removed_count = sanitize_external_text(text, max_chars=max_chars)
    warnings: list[str] = []
    if removed_count:
        warnings.append(
            f"Removed {removed_count} prompt-injection-like line(s) from fetched content."
        )
    return cleaned, warnings


def is_allowed_content_type(content_type: str) -> bool:
    normalized = (content_type or "").lower()
    return any(item in normalized for item in ALLOWED_CONTENT_TYPES)
