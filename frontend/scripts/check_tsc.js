const { execSync } = require('child_process');
const fs = require('fs');

try {
  const out = execSync('npx tsc --noEmit', { encoding: 'utf-8' });
  fs.writeFileSync('tsc_output.txt', out);
} catch (e) {
  fs.writeFileSync('tsc_output.txt', e.stdout || e.message);
}
