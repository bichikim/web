import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {once} from 'node:events'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {connectionSchema} from '../../src/backend/protocol'
import {observeHostRequests} from './observe-host-requests'

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
    errors += String(chunk).replace(/ws:\/\/\S+/gu, '[inspector endpoint]')
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
    const observation =
      process.env.POFFO_RUNTIME_DIAGNOSTICS === 'true'
        ? await observeHostRequests({
            connection,
            path: join(
              process.env.POFFO_VALIDATION_OUTPUT ?? workspace,
              'runtime',
              connection.sessionId,
              'requests.json',
            ),
            workspace,
          })
        : undefined
    return {
      close: async () => {
        if (child.exitCode !== null) {
          return
        }
        const exited = once(child, 'exit', {signal: AbortSignal.timeout(LIMIT)})
        await observation?.restore()
        console.log('Closing installed host after parent EOF', {
          backendPid: connection.pid,
          launcherPid: child.pid,
        })
        child.stdin.end()
        await exited.catch(async (error: unknown) => {
          const descriptorPresent = await readFile(join(workspace, '.poffo/connection.json')).then(
            () => true,
            () => false,
          )
          const DIAGNOSTIC_LIMIT = 5000
          const response = await fetch(`${connection.url}/api/snapshot`, {
            headers: {Authorization: `Bearer ${connection.token}`},
            signal: AbortSignal.timeout(DIAGNOSTIC_LIMIT),
          }).then(
            async (result) => {
              await result.body?.cancel()
              return result.status
            },
            (failure: unknown) => (failure instanceof Error ? failure.message : String(failure)),
          )
          const state = {
            backendPid: connection.pid,
            descriptorPresent,
            errors,
            exitCode: child.exitCode,
            launcherPid: child.pid,
            response,
            signalCode: child.signalCode,
          }
          throw new Error(`Installed host EOF shutdown failed: ${JSON.stringify(state)}`, {
            cause: error,
          })
        })
        console.log('Installed host exited', {code: child.exitCode})
        lines.close()
        await observation?.close()
      },
      connection: observation?.connection ?? connection,
      terminate: async () => {
        if (child.exitCode === null) {
          try {
            process.kill(connection.pid, 'SIGKILL')
          } catch (error) {
            if (
              !(
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'ESRCH'
              )
            ) {
              throw error
            }
          }
          child.kill('SIGKILL')
        }
        lines.close()
        await observation?.close()
      },
    }
  } catch (error) {
    child.stdin.end()
    child.kill('SIGTERM')
    lines.close()
    throw error
  }
}
