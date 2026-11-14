---
name: pr-writer
description: Use when writing a commit message, splitting changes into commits, or drafting a pull request title and description. Builds Conventional Commits messages and PR bodies from the actual diff, with real test commands, risks, and rollback, and never invents results.
---

# PR Writer

Write commit messages and PR descriptions from the diff, not from memory of the session. Reviewers read the description to decide where to look and how hard; a wrong description is worse than none. Every claim about testing must come from a command that ran in this session, and every "what changed" line must map to the diff.

## Procedure

1. **Read the real change set.**
   - Commit: `git status --porcelain`, `git diff --staged --stat`, `git diff --staged`.
   - PR: find the base (`git merge-base HEAD origin/main`), then `git log --oneline <base>..HEAD` and `git diff <base>...HEAD --stat`, then the full diff.
2. **Find the why.** Look for the reason in the task, linked issue (`gh issue view <n>`), branch name, or user message. If you cannot find a reason, ask. Do not invent motivation.
3. **Decide whether to split.** Split into separate commits when the diff mixes:
   - refactoring and behavior change,
   - formatting or generated files and real edits,
   - dependency upgrades and feature code,
   - two unrelated fixes.
   Keep a commit atomic: it builds, tests pass, and it can be reverted alone. Stage parts with `git add -p` or by path. Ask before rewriting existing commits.
4. **Write each commit message** in Conventional Commits form:
   ```
   <type>(<scope>): <imperative summary, <= 72 chars, no period>

   <body: why the change is needed and what approach was taken,
   wrapped at 72 columns>

   <footers: Fixes #123, BREAKING CHANGE: ..., Co-authored-by: ...>
   ```
   Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`, `style`. Scope is the module or package name used in the repo (check `git log --oneline -30` for local conventions and follow them over this default). Mark breaking changes with `!` after the type and a `BREAKING CHANGE:` footer.
5. **Collect test evidence.** Use commands and results from this session only. If tests were not run, run them now (detect the toolchain from `package.json` scripts, `pyproject.toml`, `Makefile`, `go.mod`, `Cargo.toml`). If they cannot run, write "Not run: <reason>".
6. **Assess risk.** Note what could break: data migrations, changed public APIs, config or env var changes, performance-sensitive paths, auth or payment code, feature flags. Name the specific files.
7. **Write the rollback plan.** Usually `git revert <sha>`. State extra steps when needed: down-migrations, flag flips, cache purges, re-deploying a previous version of a dependent service.
8. **Draft the PR** with the template below. Keep the summary under 5 lines. Link issues. Mention screenshots or recordings for UI changes and ask the user to attach them.
9. **Show the draft to the user** before running `git commit`, `git push`, or `gh pr create`, unless they asked you to proceed directly.

## Rules

- Never write "tests pass", "verified", or "no regressions" without the command and its output line from this session.
- Never list a change that is not in the diff. Never omit a change that is in the diff; group small ones under "Other".
- Describe behavior, not keystrokes: "Reject expired tokens in middleware" not "Updated auth.ts".
- No filler phrases ("This PR aims to", "various improvements"). No emoji unless the repo uses them.
- Do not mention AI tools or the session in the message unless the user or repo policy requires an attribution trailer.

## Stop conditions

- The diff contains unrelated changes or debug leftovers: list them and ask before committing.
- The diff contains secrets or credentials: stop, do not commit.
- The purpose of a change is unclear from the diff and the context: ask.

## Output

Commit message (one per commit), then the PR body:

```
## Summary
<1-3 sentences: the problem and why this change solves it>
Fixes #<n>

## Changes
- <behavior change 1> (path/to/file.ts)
- <behavior change 2> (path/to/other.py)
- Other: <small items>

## How tested
- `pnpm test` -> "Tests: 96 passed, 96 total"
- `pnpm e2e -- checkout.spec.ts` -> 4 passed
- Manual: <exact steps and observed result> | Not run: <reason>

## Risks
- <specific risk and affected area> | Low: <why>

## Rollback
- `git revert <sha>`; <extra steps, e.g. run migration 0042 down>
```
