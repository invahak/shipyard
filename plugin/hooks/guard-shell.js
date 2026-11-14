#!/usr/bin/env node
'use strict';
// PreToolUse guard for Bash and PowerShell: blocks commands that destroy data,
// rewrite shared history, skip safety checks or run untrusted remote code.
const { readInput, block, disabled } = require('./lib');

const PROTECTED_BRANCHES = (process.env.SHIPYARD_PROTECTED_BRANCHES || 'main,master,production,prod,release')
  .split(',').map((s) => s.trim()).filter(Boolean);
const branchAlt = PROTECTED_BRANCHES.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

const DB_CLIENT = '(?=[^\\n]*\\b(?:psql|mysql|mariadb|sqlite3|sqlcmd|duckdb|clickhouse-client|cockroach|mongosh)\\b)';

// Each rule: [regex, reason]. Regexes run against the whole command and each
// segment split on ; && || | and newlines.
const RULES = [
  // rm -rf on root, home, parent dir, wildcard-only or a drive root
  [/\brm\s+(?:-[a-zA-Z]*\s+)*-(?:[a-zA-Z]*[rR][a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*[rR])[a-zA-Z]*\s+(?:-\S+\s+)*(?:\/|~\/?|\$HOME\/?|\*|\.\.?\/?|\/\*|[A-Za-z]:[\\/]?)(?:\s|$)/,
    'recursive force delete of a root, home, parent or wildcard path.'],
  [/\brm\s+(?:-\S+\s+)*--no-preserve-root\b/, 'rm with --no-preserve-root.'],
  [/\bRemove-Item\b[^\n]*-Recurse\b[^\n]*\s(?:[A-Za-z]:\\?|~|\$HOME|\$env:USERPROFILE|\\)(?:\s|$|")/i,
    'recursive delete of a drive root or home directory.'],
  [/\b(?:mkfs(?:\.\w+)?|format\s+[A-Za-z]:|diskpart)\b/i, 'disk formatting command.'],
  [/\bdd\b[^\n]*\bof=\/dev\/(?!null\b)/, 'dd writing to a raw device.'],
  [/>\s*\/dev\/(?:sd[a-z]|nvme\d|disk\d)/, 'redirect onto a raw disk device.'],
  [/:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, 'fork bomb.'],
  [/\bchmod\s+(?:-\S+\s+)*-R\s+0?777\b|\bchmod\s+0?777\s+(?:-\S+\s+)*-R\b/, 'recursive chmod 777.'],

  // git history and working-tree destruction
  [new RegExp(`\\bgit\\s+push\\b(?=[^\\n]*(?:\\s--force(?!-with-lease)\\b|\\s-f\\b|\\s\\+\\S))(?=[^\\n]*\\b(?:${branchAlt})\\b)`),
    'force push to a protected branch.'],
  [/\bgit\s+push\b[^\n]*\s--force(?!-with-lease)\b/, 'force push without --force-with-lease. Use --force-with-lease on a feature branch.'],
  [/\bgit\s+push\b[^\n]*\s-f\b/, 'force push (-f). Use --force-with-lease on a feature branch.'],
  [/\bgit\s+push\b[^\n]*\s--mirror\b/, 'git push --mirror overwrites every remote ref.'],
  [new RegExp(`\\bgit\\s+push\\b[^\\n]*\\s(?:--delete\\s+|:)(?:${branchAlt})\\b`), 'deleting a protected remote branch.'],
  [/\bgit\s+reset\s+(?:\S+\s+)*--hard\b/, 'git reset --hard discards uncommitted work. Use git stash first or ask the user.'],
  [/\bgit\s+clean\s+(?:-\S+\s+)*-[a-zA-Z]*f/, 'git clean -f deletes untracked files permanently.'],
  [/\bgit\s+checkout\s+(?:--\s+)?\.(?:\s|$)|\bgit\s+restore\s+(?:--\S+\s+)*\.(?:\s|$)/, 'discarding all working-tree changes.'],
  [/\bgit\s+(?:commit|push|merge|rebase)\b[^\n]*\s--no-verify\b/, '--no-verify skips the repository hooks. Fix the hook failure instead.'],
  [/\bgit\s+filter-(?:branch|repo)\b/, 'history rewrite with filter-branch/filter-repo.'],
  [/\bgit\s+branch\s+(?:\S+\s+)*-D\s/, 'git branch -D force-deletes an unmerged branch.'],
  [/\bgit\s+stash\s+(?:clear|drop)\b/, 'dropping stashed work permanently.'],

  // remote code execution
  [/\b(?:curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|k|da)?sh\b/i, 'piping a downloaded script into a shell.'],
  [/\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:python3?|node|perl|ruby)\b/, 'piping a downloaded script into an interpreter.'],
  [/\b(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n]*\|\s*(?:iex|Invoke-Expression)\b/i, 'piping a download into Invoke-Expression.'],

  // databases and infrastructure
  // SQL rules apply only when the command runs a database client, so commit
  // messages or grep patterns that mention SQL keywords pass.
  [new RegExp(`${DB_CLIENT}[^\\n]*\\bDROP\\s+(?:DATABASE|SCHEMA|TABLE)\\b`, 'i'), 'DROP statement.'],
  [new RegExp(`${DB_CLIENT}[^\\n]*\\bTRUNCATE\\s+(?:TABLE\\s+)?\\w`, 'i'), 'TRUNCATE statement.'],
  [new RegExp(`${DB_CLIENT}[^\\n]*\\bDELETE\\s+FROM\\s+[\\w."\`]+\\s*(?:;|"|'|$)`, 'i'), 'DELETE without a WHERE clause.'],
  [/\b(?:prisma\s+migrate\s+reset|rails\s+db:(?:drop|reset)|rake\s+db:(?:drop|reset)|manage\.py\s+flush)\b/, 'database reset command.'],
  [/\bterraform\s+(?:destroy|apply\b[^\n]*-auto-approve)\b/, 'terraform destroy or unattended apply.'],
  [/\bkubectl\s+delete\s+(?:ns|namespace|all|pv|pvc)\b|\bkubectl\s+delete\b[^\n]*--all\b/, 'bulk kubectl delete.'],
  [/\bdocker\s+(?:system|volume)\s+prune\b[^\n]*(?:-a|--all|--volumes|-f)/, 'docker prune that removes volumes or all images.'],
  [/\baws\s+s3\s+(?:rm|rb)\b[^\n]*--recursive|\baws\s+s3\s+rb\b[^\n]*--force/, 'recursive S3 delete.'],

  // publishing
  [/\b(?:npm|pnpm|yarn)\s+publish\b|\bcargo\s+publish\b|\btwine\s+upload\b|\bgem\s+push\b|\bpoetry\s+publish\b/, 'publishing a package to a public registry.'],
];

function segments(cmd) {
  return [cmd, ...cmd.split(/\s*(?:;|&&|\|\||\n)\s*/)].filter(Boolean);
}

function check(cmd) {
  for (const seg of segments(cmd)) {
    for (const [re, reason] of RULES) {
      if (re.test(seg)) return reason;
    }
  }
  return null;
}

module.exports = { check };

if (require.main === module) {
  readInput().then((input) => {
    if (disabled()) process.exit(0);
    const cmd = String((input.tool_input && input.tool_input.command) || '');
    const reason = check(cmd);
    if (reason) block(reason);
    process.exit(0);
  });
}
