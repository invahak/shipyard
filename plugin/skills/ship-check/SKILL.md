---
name: ship-check
description: Use when about to say work is done, fixed, or passing, before committing, pushing, or opening a PR. Runs the project's real test, lint, typecheck, and build commands, re-reads the full diff for leftovers and secrets, and checks each acceptance criterion against evidence.
---

# Ship Check

Gate every completion claim behind fresh command output. Claims like "done", "fixed", or "tests pass" are only allowed when this session ran the command and the output is in front of you. This skill detects the toolchain, runs every available check, inspects the full diff, and maps each acceptance criterion to evidence. If a check cannot run, report that as a gap, never as a pass.

## Procedure

1. Detect the toolchain from files in the repo root (and the package root in monorepos):
   - `package.json`: read `scripts` for `test`, `lint`, `typecheck`, `type-check`, `build`, `check`. Pick the manager by lockfile: `pnpm-lock.yaml` -> `pnpm`, `yarn.lock` -> `yarn`, `bun.lockb`/`bun.lock` -> `bun`, else `npm run`.
   - `pyproject.toml` / `setup.cfg` / `tox.ini`: `pytest -q`, `ruff check .`, `mypy <pkg>` or `pyright`. Prefix with `uv run` or `poetry run` if `uv.lock` or `poetry.lock` exists.
   - `go.mod`: `go build ./...`, `go vet ./...`, `go test ./...`, plus `golangci-lint run` if `.golangci.yml` exists.
   - `Cargo.toml`: `cargo build`, `cargo clippy --all-targets -- -D warnings`, `cargo test`.
   - `Makefile` / `justfile` / `Taskfile.yml`: prefer targets named `test`, `lint`, `check`, `ci` over guessed commands.
   - `.github/workflows/*.yml`: read the CI steps. CI is the source of truth for what "passing" means.
2. Run each check. Capture the exit code and the last 20-40 lines of output. Run the full suite, not only the tests you touched. If the suite takes over 10 minutes, run the affected packages and state that scope.
3. On failure, decide whether your change caused it: run `git stash`, rerun the failing check, then `git stash pop`. A failure that also happens without your change is pre-existing. Report it separately and do not fix it silently.
4. Re-read the full diff, not only the last edit:
   - `git status --porcelain` for untracked files that should or should not ship.
   - `git diff` and `git diff --staged`, or `git diff <base>...HEAD` for a branch.
5. Scan the diff for leftovers. Check each added line for:
   - Debug output: `console.log`, `print(`, `dbg!`, `fmt.Println`, `debugger`, `pdb.set_trace`, `binding.pry`.
   - New `TODO`, `FIXME`, `XXX`, `HACK` that you added without a reason.
   - Commented-out code blocks, `.only(`, `fit(`, `@skip`, `t.Skip`, `#[ignore]`.
   - Secrets: `AKIA`, `sk-`, `ghp_`, `xox`, `-----BEGIN`, `password=`, `.env` files, tokens in URLs.
   - Unrelated changes: formatting churn, renamed files, lockfile edits nobody asked for.
   - Large files over 1 MB or generated artifacts (`dist/`, `build/`, `*.min.js`, coverage output).
6. Use a quick grep to back up the visual scan:
   `git diff -U0 | grep -nE '^\+.*(console\.log|print\(|debugger|TODO|FIXME|\.only\(|AKIA|sk-[A-Za-z0-9]{20})'`
7. List the acceptance criteria from the task, issue, or user message. For each criterion, name the evidence: a test name, a command output line, or a manual check with its exact steps. A criterion with no evidence stays "unverified".
8. Fix what you can (remove leftovers, fix your own failures), then rerun the affected checks. Old output does not count after a code change.

## Stop conditions

- A check fails because of your change and the fix is not obvious after two attempts: stop, show the output, and ask.
- No test, lint, or build command exists: say so, propose the minimum check, and do not claim "passing".
- The diff contains a secret: stop, do not commit, and tell the user to rotate the secret if it was ever pushed.
- The diff touches files outside the task scope: list them and ask before you keep them.
- An acceptance criterion is ambiguous: quote it and ask what "done" means.

## Output

Report exactly this shape. Every "pass" needs a command and a quoted result line.

```
Ship check: READY | NOT READY

Checks
- test:      `pnpm test` -> exit 0, "Tests: 142 passed, 142 total"
- lint:      `pnpm lint` -> exit 0
- typecheck: `pnpm tsc --noEmit` -> exit 0
- build:     not configured (no build script)

Diff review (7 files, +210 -34)
- Removed: console.log in src/api/user.ts:88
- Kept intentionally: TODO in src/cache.ts:12 (tracked in #431)

Acceptance criteria
1. Rejects expired tokens -> test "rejects expired token" (auth.test.ts)
2. Logs failed attempts -> unverified: no test, manual check not run

Pre-existing failures: none
Gaps: <what was not verified and why>
```
