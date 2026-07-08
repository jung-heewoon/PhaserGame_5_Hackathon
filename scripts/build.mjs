import {spawnSync} from 'node:child_process'
import {copyFileSync, existsSync, rmSync, statSync} from 'node:fs'
import {createRequire} from 'node:module'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const devvitPath = path.join(root, 'devvit.json')
const devvitClientPath = path.join(root, 'devvit.client.json')
const devvitBackupPath = path.join(root, 'devvit.json.build.bak')
const require = createRequire(import.meta.url)
const viteBin = path.resolve(root, 'node_modules/vite/bin/vite.js')
const esbuildBin = require.resolve('esbuild/bin/esbuild')

const clientArtifacts = [
  path.join(root, 'dist/client/game.html'),
  path.join(root, 'dist/client/splash.html'),
  path.join(root, 'dist/client/game.js'),
]

function clientBuildSucceeded() {
  return clientArtifacts.every(artifact => {
    if (!existsSync(artifact)) return false
    return statSync(artifact).size > 0
  })
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

function runViteBuild() {
  if (process.platform === 'win32') {
    // Avoid Windows native crashes when Node spawns Vite/Rollup in-process.
    const psArgs = [
      '-NoProfile',
      '-Command',
      `Start-Process -FilePath '${process.execPath.replace(/'/g, "''")}' -ArgumentList '--max-old-space-size=8192','${viteBin.replace(/'/g, "''")}','build' -WorkingDirectory '${root.replace(/'/g, "''")}' -Wait -NoNewWindow; exit $LASTEXITCODE`,
    ]
    return run('powershell', psArgs, {shell: false})
  }

  return run(
    process.execPath,
    ['--max-old-space-size=8192', viteBin, 'build'],
    {
      env: {...process.env, NODE_OPTIONS: '--max-old-space-size=8192'},
    },
  )
}

function runServerBuild() {
  const status = run(process.execPath, [
    esbuildBin,
    '--bundle',
    '--log-level=warning',
    '--sourcemap=linked',
    '--target=es2023',
    '--format=cjs',
    '--outfile=dist/server/index.cjs',
    '--platform=node',
    'src/server/index.ts',
  ])
  if (status !== 0) {
    throw new Error(`Server build failed (${status})`)
  }
}

function removeDist() {
  const distPath = path.join(root, 'dist')
  if (!existsSync(distPath)) return

  if (process.platform === 'win32') {
    const status = run(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Remove-Item -LiteralPath '${distPath.replace(/'/g, "''")}' -Recurse -Force -ErrorAction Stop`,
      ],
      {shell: false},
    )
    if (status !== 0) {
      throw new Error(`Failed to remove dist (${status})`)
    }
    return
  }

  rmSync(distPath, {recursive: true, force: true})
}

removeDist()

copyFileSync(devvitPath, devvitBackupPath)
copyFileSync(devvitClientPath, devvitPath)

let exitCode = 0

try {
  const viteStatus = runViteBuild()
  if (!clientBuildSucceeded()) {
    throw new Error(`Vite client build failed (${viteStatus})`)
  }
  if (viteStatus !== 0) {
    console.warn(
      `Vite exited with code ${viteStatus}, but client artifacts exist — continuing server build.`,
    )
  }
  runServerBuild()
} catch (error) {
  exitCode = 1
  console.error(error)
} finally {
  copyFileSync(devvitBackupPath, devvitPath)
}

if (
  !clientBuildSucceeded() ||
  !existsSync(path.join(root, 'dist/server/index.cjs'))
) {
  exitCode = 1
}

process.exit(exitCode)
