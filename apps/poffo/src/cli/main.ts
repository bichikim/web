import {runCli} from './run-cli'

runCli(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({error: error instanceof Error ? error.message : 'Poffo command failed', ok: false})}\n`,
  )
  process.exitCode = 1
})
