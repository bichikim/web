#!/usr/bin/env node
import {runCli} from '../dist/cli.mjs'

runCli(process.argv.slice(2)).then(
  (exitCode) => {
    process.exitCode = exitCode
  },
  (error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  },
)
