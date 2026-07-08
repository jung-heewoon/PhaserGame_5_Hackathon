import {spawnSync} from 'node:child_process'
import {existsSync, rmSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distPath = path.join(root, 'dist')

if (!existsSync(distPath)) {
  process.exit(0)
}

if (process.platform === 'win32') {
  const result = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Remove-Item -LiteralPath '${distPath.replace(/'/g, "''")}' -Recurse -Force -ErrorAction Stop`,
    ],
    {stdio: 'inherit', shell: false},
  )
  process.exit(result.status ?? 1)
}

rmSync(distPath, {recursive: true, force: true})
