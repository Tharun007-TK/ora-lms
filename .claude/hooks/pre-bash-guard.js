#!/usr/bin/env node
const fs = require('fs');

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (e) {
  process.exit(0);
}

let input;
try {
  input = JSON.parse(raw);
} catch (e) {
  process.exit(0);
}

const cmd = (input && input.tool_input && input.tool_input.command) || '';

const patterns = [
  { re: /rm\s+-rf\s+[\/~]/, msg: 'rm -rf on root/home' },
  { re: /git\s+push\s+--?f(orce)?\b/, msg: 'force push' },
  { re: /\|\s*sh\b/, msg: 'pipe to shell' },
  { re: /\|\s*bash\b/, msg: 'pipe to bash' },
  { re: /:\(\)\s*\{/, msg: 'fork bomb pattern' },
  { re: /\bsudo\s+/, msg: 'privilege escalation' },
  { re: /chmod\s+777/, msg: 'world-writable permissions' },
  { re: /\bssh\s+/, msg: 'outbound ssh connection' },
  { re: />\s*\/dev\//, msg: 'write to device file' },
];

for (const { re, msg } of patterns) {
  if (re.test(cmd)) {
    console.error(`BLOCKED: ${msg} — pattern ${re}`);
    process.exit(2);
  }
}

process.exit(0);
