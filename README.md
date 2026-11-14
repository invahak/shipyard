# Shipyard Lite — make Claude Code prove its work before it says "done"

A free Claude Code plugin with three skills, two subagents, three commands and a hook that blocks destructive shell commands.

- **`/shipyard-lite:ship`** runs your tests, lint and type checks, re-reads the diff for leftovers and drafts the commit message. Claude reports evidence, not "should work".
- **`/shipyard-lite:fix-issue <bug>`** makes Claude reproduce the bug, rank hypotheses, fix the root cause and add a regression test.
- **`/shipyard-lite:review`** sends the current diff to a read-only reviewer subagent. You get findings with severity, `file:line` and a fix.
- **Guard hook** stops `rm -rf ~`, `git push --force origin main`, `git reset --hard`, `curl | sh`, `DROP TABLE`, `terraform destroy` and more before they run. Claude gets the reason and asks you.

## Install

In Claude Code:

```
/plugin marketplace add invahak/shipyard
/plugin install shipyard-lite@shipyard
```

Restart Claude Code. Requires Node.js 18+ on `PATH` for the hook.

## What is included

| Type | Name | Purpose |
|---|---|---|
| Skill | `ship-check` | Verification gate before "done", commit or PR |
| Skill | `bug-hunt` | Reproduce, hypothesize, bisect, fix root cause, regression test |
| Skill | `pr-writer` | Commit messages and PR descriptions from the real diff |
| Agent | `code-reviewer` | Read-only diff review, bugs first |
| Agent | `repo-scout` | Fast, cheap `file:line` locator |
| Command | `/ship`, `/review`, `/fix-issue` | Entry points for the above |
| Hook | `guard-shell` | Blocks destructive Bash and PowerShell commands |

Turn the guard off for one session with `SHIPYARD_GUARD=off`.

## Shipyard Pro

Pro is the full kit: **10 skills, 6 subagents, 8 commands, 4 hooks, 5 CLAUDE.md templates and 2 permission presets**, plus an installer for setups without plugins.

Pro adds: `test-first`, `safe-refactor`, `security-sweep`, `perf-probe`, `dependency-upgrade`, `codebase-onboarding` and `claude-md-tuner` skills; `test-writer`, `security-auditor`, `perf-analyst` and `docs-writer` agents; `/plan`, `/tdd`, `/changelog`, `/onboard` and `/tune-claude-md`; hooks that block secrets in files and edits to `.env`, keys and lockfiles; and a session-start git snapshot.

**$19 one-time, all 1.x updates included: [get Shipyard Pro](https://invahak.github.io/shipyard/#pro)**

## License

Shipyard Lite is MIT. Shipyard Pro has a single-developer commercial license.
