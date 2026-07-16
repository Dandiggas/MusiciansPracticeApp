"""Parse a pasted set list (WhatsApp/email text) into (title, key) pairs.

Deliberately regex-only: deterministic, testable, no network. The preview UI
is the safety valve for anything the heuristics get wrong.
"""

import difflib
import re

# Root note + optional accidental, optional minor/major marker.
_KEY_CORE = r"[A-G](?:[#b♯♭])?"
_MINOR = r"(?:m|min|minor)"
_MAJOR = r"(?:maj|major)"
_KEY_PATTERN = rf"(?P<root>{_KEY_CORE})\s*(?P<quality>{_MINOR}|{_MAJOR})?"

_LEADING_NOISE_RE = re.compile(r"^\s*(?:\d+\s*[.)]|[-•*·])\s*")
_SEPARATED_KEY_RE = re.compile(
    rf"^(?P<title>.+?)\s*[–—\-|:,]\s*{_KEY_PATTERN}\s*$"
)
_PAREN_KEY_RE = re.compile(
    rf"^(?P<title>.+?)\s*\(\s*(?:in\s+)?{_KEY_PATTERN}\s*\)\s*$",
    re.IGNORECASE,
)
_IN_KEY_RE = re.compile(rf"^(?P<title>.+?)\s+in\s+{_KEY_PATTERN}\s*$")
_TRAILING_KEY_RE = re.compile(rf"^(?P<title>.+?\S)\s+{_KEY_PATTERN}\s*$")


def _normalize_key(root: str, quality: str | None) -> str:
    root = root.replace("♯", "#").replace("♭", "b")
    root = root[0].upper() + root[1:]
    if quality and quality.lower() in ("m", "min", "minor"):
        return f"{root}m"
    return root


def _clean_title(title: str) -> str:
    title = re.sub(r"[\U0001F000-\U0001FAFF☀-➿️]", "", title)
    title = re.sub(r"\s+", " ", title).strip(" -–—|:,")
    return title.strip()


def _try_parse_key(line: str):
    """Return (title, key) if a key can be read off the line, else None."""
    for pattern in (_SEPARATED_KEY_RE, _PAREN_KEY_RE, _IN_KEY_RE):
        match = pattern.match(line)
        if match:
            return match.group("title"), _normalize_key(
                match.group("root"), match.group("quality")
            )

    # Bare trailing key ("Living Hope E") — only when the title keeps
    # at least one word, so a single-word line stays a title.
    match = _TRAILING_KEY_RE.match(line)
    if match and match.group("title").strip():
        # The root must be uppercase in the raw text; a lowercase 'e' is prose.
        raw_root = match.group("root")
        if raw_root[0].isupper():
            return match.group("title"), _normalize_key(
                raw_root, match.group("quality")
            )
    return None


def parse_set_list(text: str) -> list[dict]:
    """Parse pasted text into [{line, title, key|None}] — one per song line."""
    items = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # Header lines ("Sunday set:") introduce, they aren't songs.
        if line.endswith(":"):
            continue

        line_no_noise = _LEADING_NOISE_RE.sub("", line)
        if not line_no_noise:
            continue

        parsed = _try_parse_key(line_no_noise)
        if parsed:
            title, key = parsed
        else:
            title, key = line_no_noise, None

        title = _clean_title(title)
        if not title:
            continue

        items.append({"line": raw_line.strip(), "title": title, "key": key})
    return items


_NORMALIZE_RE = re.compile(r"[^a-z0-9 ]")


def normalize_title(name: str) -> str:
    name = name.lower()
    name = _NORMALIZE_RE.sub("", name)
    name = re.sub(r"\s+", " ", name).strip()
    if name.startswith("the "):
        name = name[4:]
    return name


# Whole-word prefix matches ("way maker" -> "way maker leeland") need this
# many characters before they count — stops "holy" claiming "holy spirit".
_PREFIX_MIN_CHARS = 6


def _whole_word_prefix(shorter: str, longer: str) -> bool:
    return len(shorter) >= _PREFIX_MIN_CHARS and longer.startswith(shorter + " ")


def match_titles(titles: list[str], candidates: dict[str, dict], cutoff: float = 0.87):
    """Match parsed titles against {normalized_name: track_info} candidates.

    Returns a list (aligned with titles) of track_info dicts or None.
    Exact normalized match first, then whole-word prefix (either direction,
    to survive "(Leeland)"-style suffixes), then difflib as a last resort.
    """
    results = []
    keys = list(candidates.keys())
    for title in titles:
        norm = normalize_title(title)
        if not norm:
            results.append(None)
            continue
        if norm in candidates:
            results.append(candidates[norm])
            continue

        prefix_hits = [
            key
            for key in keys
            if _whole_word_prefix(norm, key) or _whole_word_prefix(key, norm)
        ]
        if prefix_hits:
            # Prefer the closest-length candidate when several share the prefix.
            best = min(prefix_hits, key=lambda key: abs(len(key) - len(norm)))
            results.append(candidates[best])
            continue

        close = difflib.get_close_matches(norm, keys, n=1, cutoff=cutoff)
        results.append(candidates[close[0]] if close else None)
    return results
