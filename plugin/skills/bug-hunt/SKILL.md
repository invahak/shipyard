---
name: bug-hunt
description: Use when a bug, failing test, crash, flaky behavior, or regression appears, before proposing any fix. Reproduces the failure, ranks hypotheses, tests them one at a time with instrumentation or git bisect, fixes the root cause, and adds a regression test.
---

# Bug Hunt

Find the root cause before you change code. A fix that makes the symptom disappear without an explained mechanism is a guess, and guesses ship new bugs. This skill turns a bug report into a reliable reproduction, a confirmed cause, a minimal fix, and a regression test that fails before the fix and passes after it.

## Procedure

1. **Capture the exact failure.** Copy the full error message, stack trace, exit code, and input. Note the environment: OS, runtime version (`node -v`, `python --version`, `go version`, `rustc -V`), branch, commit (`git rev-parse --short HEAD`). Do not paraphrase errors.
2. **Reproduce it.** Write the shortest command that shows the failure, for example:
   - `npx vitest run src/cart.test.ts -t "applies discount"` / `npx jest path -t "name"`
   - `pytest tests/test_cart.py::test_discount -x -vv`
   - `go test ./cart -run TestDiscount -count=1 -v`
   - `cargo test discount -- --nocapture`
   For flaky bugs, loop until it fails: `for i in $(seq 1 50); do <cmd> || break; done`, `pytest --count=50` (pytest-repeat), `go test -count=50 -race`. Record the failure rate.
3. **Minimize.** Remove inputs, config, and code paths until removing anything more makes the bug vanish. The smallest failing case usually points at the cause.
4. **Read before guessing.** Read the code on the stack trace path, top frame first. Check `git log -p --since=2.weeks -- <file>` for recent changes there.
5. **Rank hypotheses.** Write 2-5 candidate causes. Order them by likelihood and by cost to test. For each one, state the observation that would confirm or kill it.
6. **Test one hypothesis at a time.** Add targeted instrumentation: a log line with a unique prefix (`[BUGHUNT]`) that prints the values in question, an assertion, or a debugger breakpoint (`node --inspect-brk`, `python -m pdb`, `dlv test`, `rust-gdb`). Change one variable per run. Write down the result before moving to the next hypothesis.
7. **Bisect regressions.** If it worked at a known commit, run:
   `git bisect start; git bisect bad HEAD; git bisect good <sha>`
   then `git bisect run <repro-cmd>` (exit 0 = good, 1-124 = bad, 125 = skip). Finish with `git bisect reset`. Read the culprit commit fully.
8. **Explain the mechanism.** State in one or two sentences why the bug happens: which input reaches which line and produces which wrong state. If you cannot explain it, you have not found it.
9. **Write the regression test first.** Encode the minimized case as a test. Run it and confirm it fails with the same error as the original bug.
10. **Fix the root cause.** Change the code where the wrong state originates, not where it surfaces. Avoid symptom patches: extra null checks, broad `try/catch`, retries, sleeps, or widened timeouts that hide the cause.
11. **Verify.** Run the regression test (now passes), the full suite, and the original repro command. For flaky bugs, rerun the loop at least as many times as it took to fail, times three.
12. **Remove instrumentation.** `git diff | grep BUGHUNT` must return nothing. Remove temporary breakpoints and debug flags.
13. **Check siblings.** Grep for the same pattern elsewhere (`rg '<pattern>'`). Report other instances; fix them only if in scope.

## Stop conditions

- **Three failed fixes rule:** after three fixes that did not work, stop changing code. List every assumption you made (about inputs, environment, call order, library behavior, which code actually runs). Verify each one with a direct observation. Report to the user if the cause is still unknown.
- You cannot reproduce the bug after 30 minutes or 5 distinct attempts: stop and ask for exact input, logs, or environment details.
- The root cause is in a dependency or external service: report the evidence and propose a workaround. Do not patch `node_modules` or vendored code silently.
- The fix requires a behavior change other callers rely on: stop and ask.

## Red flags

- "It should work now" without a rerun.
- A fix that changes a timeout, sleep, or retry count.
- The regression test passes before the fix (it does not test the bug).
- More than one hypothesis changed in a single run.

## Output

```
Bug: <one-line symptom>
Repro: `<command>` -> <exact error line> (fails 10/10 | 7/50 flaky)
Root cause: <mechanism>, at path/to/file.ext:LINE
Introduced by: <sha> "<commit subject>" (via git bisect) | unknown
Fix: <what changed and why it addresses the cause>
Regression test: <test name> - failed before fix, passes after
Verification: `<full suite cmd>` -> <summary line>
Hypotheses rejected: <h1: evidence>, <h2: evidence>
Similar patterns found: <file:line list> | none
```
