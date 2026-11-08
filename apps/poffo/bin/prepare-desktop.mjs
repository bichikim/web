#!/usr/bin/env node
import {execFileSync, spawn} from 'node:child_process'
import {once} from 'node:events'
import {copyFile, cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {parseArgs} from 'node:util'
import {build} from 'vite'
import {downloadNode} from './download-node.mjs'
import {collectNotices} from './collect-notices.mjs'

const application = fileURLToPath(new URL('../', import.meta.url))
const desktop = join(application, 'src-tauri')
const runtime = join(desktop, 'runtime')
const {values} = parseArgs({options: {'skip-build': {type: 'boolean'}, target: {type: 'string'}}})
const target =
  values.target ??
  process.env.TAURI_ENV_TARGET_TRIPLE ??
  execFileSync('rustc', ['--print', 'host-tuple'], {encoding: 'utf8'}).trim()

const run = async (command, args, options = {}) => {
  const child = spawn(command, args, {cwd: application, stdio: 'inherit', ...options})
  const [code] = await once(child, 'exit')
  if (code !== 0) {
    throw new Error(`${command} exited ${code}`)
  }
}

if (values['skip-build'] !== true) {
  await run('pnpm', ['exec', 'turbo', 'run', 'build', '--filter=@winter-love/poffo...'], {
    shell: process.platform === 'win32',
  })
}
await rm(runtime, {force: true, recursive: true})
await cp(join(application, 'dist'), runtime, {recursive: true})
await rm(join(runtime, 'cli'), {force: true, recursive: true})
await mkdir(join(runtime, 'licenses'), {recursive: true})
let modules = []
await build({
  build: {
    minify: false,
    outDir: join(runtime, 'cli'),
    ssr: join(application, 'src/cli/main.ts'),
    target: 'node24',
  },
  configFile: false,
  plugins: [
    {
      buildEnd() {
        modules = [...this.getModuleIds()]
      },
      name: 'poffo-license-notices',
    },
  ],
  root: application,
  ssr: {external: ['vite'], noExternal: true},
})
// Frame PNG encoding is bundled only into the GUI, outside the CLI module graph.
const framePng = fileURLToPath(import.meta.resolve('fast-png'))
const requireFramePng = createRequire(framePng)
await collectNotices(
  [...modules, framePng, requireFramePng.resolve('iobuffer'), requireFramePng.resolve('fflate')],
  join(runtime, 'licenses', 'dependencies.txt'),
)
const node = await downloadNode({
  directory: join(desktop, 'binaries'),
  licenses: join(runtime, 'licenses'),
  target,
})
await run('cargo', [
  'build',
  '--release',
  '--manifest-path',
  join(desktop, 'cli/Cargo.toml'),
  '--target',
  target,
  '--target-dir',
  join(desktop, 'target'),
])
const extension = target.includes('windows') ? '.exe' : ''
await copyFile(
  join(desktop, 'target', target, 'release', `poffo-cli${extension}`),
  join(desktop, 'binaries', `poffo-cli-${target}${extension}`),
)
const {version} = JSON.parse(await readFile(join(desktop, 'tauri.conf.json'), 'utf8'))
await writeFile(join(runtime, 'manifest.json'), JSON.stringify({node, target, version}, null, 2))
process.stdout.write(`Poffo runtime prepared for ${target}\n`)
