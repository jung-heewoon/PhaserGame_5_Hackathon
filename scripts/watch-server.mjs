import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)
const esbuildBin = require.resolve('esbuild/bin/esbuild')

const child = spawn(
  process.execPath,
  [
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
  ],
  {cwd: root, stdio: 'inherit'},
)

child.on('exit', code => {
  process.exit(code ?? 1)
})
