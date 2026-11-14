---
description: Find the root cause of a bug and fix it with a regression test (bug-hunt flow)
argument-hint: <bug description | issue number | issue URL>
---
Issue: $ARGUMENTS

If the argument is an issue number or URL, run `gh issue view <n> --comments` and use the title, body, and comments as the report. If the argument is empty, ask for the bug description and stop.

Use the bug-hunt skill. Follow it in this order and do not skip a step:

1. Restate the bug in one line: expected behavior, actual behavior, trigger conditions.
2. Locate the code. Delegate the search to the repo-scout agent with the error message, the symbols, and the route or command from the report.
3. Reproduce. Write a failing automated test that shows the bug. If an automated test is not possible, write the exact manual reproduction steps and run them. Show the failing output.
4. Find the root cause. Trace from the symptom to the first wrong value or state. State the cause with file:line. Do not fix the symptom site if the cause is upstream.
5. Fix with the smallest change at the root cause. No unrelated refactors or formatting changes.
6. Verify:
   - the new test passes;
   - the full test suite for the touched package passes;
   - lint and typecheck pass, if the project has them.
7. Search for the same bug pattern elsewhere (Grep the faulty construct). Report other hits; do not fix them without approval.

If you cannot reproduce the bug after 3 distinct attempts, stop. Report what you tried and what information would unblock you.

Do not commit. Finish with this shape:
```
Root cause: <file:line> - <one sentence>
Fix: <file:line> - <what changed>
Regression test: <path>::<name>
Verification: <command> -> <result> (repeat per command)
Same pattern elsewhere: <file:line list, or "none found">
```
