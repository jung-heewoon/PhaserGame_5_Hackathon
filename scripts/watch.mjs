import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require.resolve('esbuild/bin/esbuild');

const sharedArgs = [
  '--bundle',
  '--log-level=warning',
  '--sourcemap=linked',
  '--target=es2023',
  '--watch=forever',
];

function startWatch(args) {
  return spawn(process.execPath, [esbuild, ...args], {stdio: 'inherit'});
}

const processes = [
  startWatch([
    ...sharedArgs,
    '--format=esm',
    '--outdir=public',
    '--platform=browser',
    'src/client/splash.ts',
    'src/client/game.ts',
  ]),
  startWatch([
    ...sharedArgs,
    '--format=cjs',
    '--outdir=dist/server',
    '--platform=node',
    'src/server/index.ts',
  ]),
];

function cleanup(code = 0) {
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill();
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

for (const proc of processes) {
  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      cleanup(code);
    }
  });
}
