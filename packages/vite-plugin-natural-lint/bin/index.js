#!/usr/bin/env node
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const needsFfi = process.argv[2] === 'review' && !process.execArgv.includes('--experimental-ffi')

if (needsFfi) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-ffi', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {stdio: 'inherit'},
  )
  if (result.error !== undefined) {
    throw result.error
  }
  process.exitCode = result.status ?? 1
} else {
  const {runCli} = await import('../dist/cli.mjs')
  runCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode
    },
    (error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    },
  )
}
