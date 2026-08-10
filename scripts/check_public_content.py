#!/usr/bin/env python3
"""Fail when private operating material or credential-shaped text is tracked."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_FILES = {
    "AGENTS.md",
    "CLAUDE.md",
    "RUN_STATE.md",
    "STATE.md",
    "docs/APP_OVERVIEW.md",
    "docs/TODO.md",
    "docs/TODOS.md",
    "docs/frontend-design-audit.md",
    "docs/product-ideas-visual-identity.md",
}

FORBIDDEN_PREFIXES = (
    "docs/future/",
    "docs/plans/",
    "docs/superpowers/",
    "frontend/next-app/playwright-report/",
    "frontend/next-app/test-results/",
)

SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b"),
    "OpenAI-style key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "Slack token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    "SendGrid key": re.compile(r"\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b"),
}

DOC_CREDENTIAL_PATTERNS = {
    "literal account credential": re.compile(
        r"(?i)\b(?:demo|admin|tester|test user)\b[^\n]{0,40}(?:/|:)\s*`?"
        r"(?=[^\s`]{8,})(?=[^\s`]*\d)(?=[^\s`]*[!@#$%^&*])[^\s`]+"
    ),
    "literal password": re.compile(
        r"(?i)\b(?:password|passcode|credential)\b\s*(?:is|=|:)\s*`?"
        r"(?!<|your-|example|env|unset)(?=[^\s`]{8,})(?=[^\s`]*\d)"
        r"(?=[^\s`]*[!@#$%^&*])[^\s`]+"
    ),
}

PRIVATE_README_MARKERS = (
    "## Current launch blockers",
    "## Launch blockers",
    "## What this repo is not anymore",
    "docs/TODO.md",
    "docs/TODOS.md",
)


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return [path.decode() for path in result.stdout.split(b"\0") if path]


def readable_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return None


def main() -> int:
    tracked = tracked_files()
    failures: list[str] = []

    for relative in tracked:
        if relative in FORBIDDEN_FILES or relative.startswith(FORBIDDEN_PREFIXES):
            failures.append(f"private path is tracked: {relative}")

        text = readable_text(ROOT / relative)
        if text is None:
            continue

        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                failures.append(f"{label} pattern found: {relative}")

        if Path(relative).suffix.lower() in {".md", ".txt", ".html"}:
            for label, pattern in DOC_CREDENTIAL_PATTERNS.items():
                if pattern.search(text):
                    failures.append(f"{label} found in public text: {relative}")

    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for marker in PRIVATE_README_MARKERS:
        if marker in readme:
            failures.append(f"private README marker found: {marker}")

    if failures:
        print("Public-content check failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"Public-content check passed for {len(tracked)} tracked files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
