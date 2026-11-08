import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {once} from 'node:events'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {connectionSchema} from '../../src/backend/protocol'

/** A shipped runtime must not discover a development Node installation through PATH. */
export const installedEnvironment = () => ({
  ...process.env,
  NODE_OPTIONS: '--require=/nonexistent/poffo-validation.cjs',
  PATH:
    process.platform === 'win32'
      ? `${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`
      : '/usr/bin:/bin',
})

/** Starts the shipped launcher; EOF must close its owned host without an OS kill. */
export const startInstalledHost = async (executable: string, workspace: string, file?: string) => {
  const child = spawn(
    executable,
    [
      'start',
      '--cli',
      '--parent-stdio',
      '--workspace',
      workspace,
      ...(file === undefined ? [] : ['--file', file]),
    ],
    {env: installedEnvironment(), stdio: ['pipe', 'pipe', 'pipe']},
  )
  const lines = createInterface({input: child.stdout})
  let errors = ''
  child.stderr.on('data', (chunk) => {
    errors += String(chunk)
  })
  const LIMIT = 30_000
  try {
    await new Promise<void>((resolve, reject) => {
      const deadline = AbortSignal.timeout(LIMIT)
      const fail = () => reject(new Error(`Installed host did not start: ${errors}`))
      deadline.addEventListener('abort', fail, {once: true})
      child.once('error', reject)
      child.once('exit', (code) => reject(new Error(`Installed host exited ${code}: ${errors}`)))
      lines.on('line', (line) => {
        if (line.startsWith('{') && JSON.parse(line).ready === true) {
          deadline.removeEventListener('abort', fail)
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
        const exited = once(child, 'exit', {signal: AbortSignal.timeout(LIMIT)})
        child.stdin.end()
        await exited
        lines.close()
      },
      connection,
    }
  } catch (error) {
    child.stdin.end()
    child.kill('SIGTERM')
    lines.close()
    throw error
  }
}
