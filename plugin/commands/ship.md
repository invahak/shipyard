---
description: Run pre-ship checks, then draft a commit message; commits only after you confirm
argument-hint: [notes for the commit message, e.g. "closes #142"]
---
Prepare the current changes to ship. User notes for the commit message: $ARGUMENTS

1. Run `git status --short` and `git diff --stat HEAD`. If nothing changed, reply `Nothing to ship.` and stop.
2. Use the ship-check skill on the current changes. Run every check it defines. Do not skip or soften a failing check.
3. If any check fails, stop here. Print the results table (below) and ask whether to fix the failures. Do not draft a commit message.
4. If all checks pass, use the pr-writer skill to draft a commit message from the diff and the user notes above.
   - Match the repo's format. Check `git log --oneline -15`; if it uses Conventional Commits, use them.
   - Subject: imperative, at most 72 characters. Body: why the change exists, then notable details.
5. List the exact files to commit. Exclude files that look unrelated, generated, or secret (`.env*`, `*.pem`, build output). Name every excluded file.
6. Ask: `Commit these files with this message? (yes / edit / no)`. Wait for the answer.
7. Only on an explicit `yes`:
   - stage files by name: `git add <path> <path> ...` (never `git add -A` or `git add .`);
   - commit with the message via a heredoc or `-F`;
   - never use `--no-verify`, never amend, never push.
   If a hook fails, show its output and stop. Do not retry with bypass flags.

Output shape:
```
### Checks
| Check | Result | Detail |
|-------|--------|--------|
| <name> | PASS / FAIL / SKIP | <command or reason> |

### Commit message
<subject>

<body>

### Files to commit
- <path>
Excluded: <paths and reason, or "none">
```
After a commit, print `git log -1 --stat` output and nothing else.
