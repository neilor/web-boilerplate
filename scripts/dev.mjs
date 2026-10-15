// Starts the mock API and the web app together. Ctrl+C stops both.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(npm, ['run', 'start', '-w', '@web-boilerplate/mock-api'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }),
  spawn(npm, ['run', 'dev', '-w', '@web-boilerplate/web'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];

const stop = () => {
  for (const child of children) child.kill();
  process.exit();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) child.on('exit', (code) => code && stop());
