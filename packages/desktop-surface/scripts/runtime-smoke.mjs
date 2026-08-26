import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const SUCCESS_MARKER = 'DESKTOP_SURFACE_RUNTIME_OK'
const TIMEOUT_MILLISECONDS = 300_000
const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
const manifestPath = fileURLToPath(new URL('../examples/harness/Cargo.toml', import.meta.url))

if (process.platform !== 'darwin') {
  throw new Error('The desktop surface runtime test currently requires macOS.')
}

const child = spawn('cargo', ['run', '--manifest-path', manifestPath, '--', '--smoke'], {
  cwd: packageDirectory,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''

child.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  output += text
  process.stdout.write(text)
})
child.stderr.on('data', (chunk) => {
  const text = chunk.toString()
  output += text
  process.stderr.write(text)
})

const timeout = setTimeout(() => {
  child.kill('SIGTERM')
}, TIMEOUT_MILLISECONDS)

child.on('error', (error) => {
  clearTimeout(timeout)
  throw error
})

child.on('exit', (code, signal) => {
  clearTimeout(timeout)

  if (signal !== null) {
    throw new Error(`Desktop surface runtime test was terminated by ${signal}.`)
  }

  if (code !== 0 || !output.includes(SUCCESS_MARKER)) {
    throw new Error(`Desktop surface runtime test failed with exit code ${code}.`)
  }
})
