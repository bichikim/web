#!/usr/bin/env node
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {fileURLToPath} from 'node:url'

const directory = fileURLToPath(new URL('../', import.meta.url))
const prepare = spawn(
  process.execPath,
  [fileURLToPath(new URL('./prepare-desktop.mjs', import.meta.url))],
  {cwd: directory, stdio: 'inherit'},
)
const [code] = await once(prepare, 'exit')
if (code !== 0) {
  process.exit(code ?? 1)
}
const child = spawn(
  'pnpm',
  ['exec', 'vite', '--host', '127.0.0.1', '--port', '1421', '--strictPort'],
  {cwd: directory, shell: process.platform === 'win32', stdio: 'inherit'},
)
process.once('SIGTERM', () => child.kill('SIGTERM'))
process.once('SIGINT', () => child.kill('SIGINT'))
const [status] = await once(child, 'exit')
process.exitCode = status ?? 1
