const { exec } = require('child_process');
const fs = require('fs');

exec('npm run build', (error, stdout, stderr) => {
  const output = [
    '--- STDOUT ---',
    stdout,
    '--- STDERR ---',
    stderr,
    '--- ERROR ---',
    error ? error.message : 'null'
  ].join('\n\n');
  
  fs.writeFileSync('build-error.log', output, 'utf8');
  console.log('Saved to build-error.log');
});
