import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {once} from 'node:events'
import {connectionSchema} from '../../src/backend/protocol'

export const cliPath = fileURLToPath(new URL('../../bin/poffo.mjs', import.meta.url))

export const startHost = async (workspace: string, file?: string, mode = 'start') => {
  const child = spawn(
    process.execPath,
    [
      cliPath,
      mode,
      '--cli',
      '--workspace',
      workspace,
      ...(file === undefined ? [] : ['--file', file]),
    ],
    {stdio: ['ignore', 'pipe', 'pipe']},
  )
  let errors = ''
  child.stderr.on('data', (chunk) => {
    errors += String(chunk)
  })
  const lines = createInterface({input: child.stdout})
  const START_LIMIT = 30_000
  try {
    await new Promise<void>((resolve, reject) => {
      const signal = AbortSignal.timeout(START_LIMIT)
      const abort = () => reject(new Error(`Host readiness timed out: ${errors}`))
      signal.addEventListener('abort', abort, {once: true})
      child.once('error', reject)
      child.once('exit', (code) => reject(new Error(`Host exited ${code}: ${errors}`)))
      lines.on('line', (line) => {
        if (line.startsWith('{') && JSON.parse(line).ready === true) {
          signal.removeEventListener('abort', abort)
          resolve()
        }
      })
    })
    const connection = connectionSchema.parse(
      JSON.parse(await readFile(join(workspace, '.poffo/connection.json'), 'utf8')),
    )
    return {
      close: async () => {
        if (child.exitCode !== null) {
          return
        }
        const exited = once(child, 'exit', {signal: AbortSignal.timeout(START_LIMIT)})
        child.kill('SIGTERM')
        await exited
        lines.close()
      },
      connection,
    }
  } catch (error) {
    child.kill('SIGTERM')
    lines.close()
    throw error
  }
}
