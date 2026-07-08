import {spawn} from 'node:child_process'
import {copyFileSync, readFileSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const devvitPath = path.join(root, 'devvit.json')
const devvitBackupPath = path.join(root, 'devvit.json.watch.bak')
const require = createRequire(import.meta.url)
const viteBin = path.join(root, 'node_modules/vite/bin/vite.js')
const esbuildBin = require.resolve('esbuild/bin/esbuild')

function clientOnlyDevvitConfig() {
  const config = JSON.parse(readFileSync(devvitPath, 'utf8'))
  delete config.server
  delete config.menu
  delete config.triggers
  return config
}

function startProcess(command, args, env = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {...process.env, ...env},
  })
}

copyFileSync(devvitPath, devvitBackupPath)
writeFileSync(
  devvitPath,
  `${JSON.stringify(clientOnlyDevvitConfig(), null, 2)}\n`,
)

const processes = [
  startProcess(
    process.execPath,
    ['--max-old-space-size=8192', viteBin, 'build', '--watch'],
    {
      NODE_OPTIONS: '--max-old-space-size=8192',
    },
  ),
  startProcess(process.execPath, [
    esbuildBin,
    '--bundle',
    '--log-level=warning',
    '--sourcemap=linked',
    '--target=es2023',
    '--format=cjs',
    '--outfile=dist/server/index.cjs',
    '--platform=node',
    'src/server/index.ts',
    '--watch=forever',
  ]),
]

function cleanup(code = 0) {
  copyFileSync(devvitBackupPath, devvitPath)
  for (const proc of processes) {
    if (!proc.killed) proc.kill()
  }
  process.exit(code)
}

process.on('SIGINT', () => cleanup(0))
process.on('SIGTERM', () => cleanup(0))

for (const proc of processes) {
  proc.on('exit', code => {
    if (code !== 0 && code !== null) cleanup(code)
  })
}
