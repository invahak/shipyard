'use strict';
// Shared helpers for Shipyard hooks. No dependencies.

function readInput() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

// Exit code 2 blocks the tool call; stderr is shown to Claude as the reason.
function block(reason) {
  process.stderr.write(`Shipyard blocked this action: ${reason}\n` +
    'If the user explicitly wants this, ask them to run it themselves or to set SHIPYARD_GUARD=off for this session.\n');
  process.exit(2);
}

function disabled() {
  return String(process.env.SHIPYARD_GUARD || '').toLowerCase() === 'off';
}

module.exports = { readInput, block, disabled };
