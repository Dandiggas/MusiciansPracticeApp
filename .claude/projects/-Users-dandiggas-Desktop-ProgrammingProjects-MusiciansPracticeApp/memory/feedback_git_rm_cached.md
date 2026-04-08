---
name: Use git rm --cached to untrack files
description: When removing files from git tracking, use --cached flag to keep them on disk
type: feedback
---

When the user asks to remove files from GitHub/git but keep them locally, use `git rm --cached` not `git rm`.

**Why:** `git rm` deletes files from both git and the filesystem. The user only wanted them removed from GitHub, not deleted locally.

**How to apply:** Always default to `git rm --cached` when the intent is to stop tracking files, unless the user explicitly wants them deleted from disk too.
