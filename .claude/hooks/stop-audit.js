#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  const staged = out.split('\n').filter(Boolean);
  const suspicious = staged.filter(f => /\.env($|\.)|\.pem$|id_rsa|secrets\//.test(f));
  if (suspicious.length) {
    console.error('WARNING staged sensitive files:\n' + suspicious.join('\n'));
  }
} catch (e) {
  // git unavailable or not a repo
}

process.exit(0);
