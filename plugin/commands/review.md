---
description: Review uncommitted changes, a branch, or a PR with the code-reviewer agent
argument-hint: [branch | PR number | PR URL] (empty = uncommitted changes)
---
Review target: `$ARGUMENTS`

1. Resolve the target and the diff command:
   - Empty: uncommitted changes. Use `git status --short` and `git diff HEAD`. Include untracked files from `git status` by reading them in full.
   - Number or PR URL: run `gh pr view <n> --json title,body,baseRefName,headRefName` and `gh pr diff <n>`. If `gh` is missing or not authenticated, say so and ask for the base branch.
   - Branch name: find the default branch with `git symbolic-ref --short refs/remotes/origin/HEAD` (fall back to `main`, then `master`). Diff with `git diff <default>...<branch>` (three dots: only the branch's own changes).
2. Run `git diff --stat` with the same refs. If the diff is empty, reply `Nothing to review.` and stop.
3. Delegate to the code-reviewer agent. Pass it:
   - the exact diff command from step 1, so it can re-run it;
   - the PR title and body, if any, as the stated intent;
   - the instruction to check correctness first, then maintainability, and to verify every finding by reading code.
4. Print the agent's report unchanged. Do not add praise or a summary on top.
5. If the verdict is `BLOCK` or `FIX BEFORE MERGE`, end with one line:
   `Fix the blocker/major findings now? (yes / pick numbers / no)`
   Do not edit any file until the user answers.
6. When the user approves fixes, fix only the chosen findings. After the fixes, run the tests for the touched modules and show the result.

Do not commit, push, or comment on the PR from this command.
