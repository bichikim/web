import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdir, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

interface CaptureRuntimeOptions {
  /** PID read from the isolated host's descriptor, never a discovered user process. */
  readonly pid: number
  /** Destination for selected resources and endpoints, excluding process environment and memory. */
  readonly path: string
  /** Public operation or cleanup stage that failed. */
  readonly stage: string
}

/** Attaches only after a failure and disconnects before test-owned process cleanup. */
export const captureRuntimeState = async ({pid, path, stage}: CaptureRuntimeOptions) => {
  const debuggerProcess = spawn(process.execPath, ['inspect', '-p', String(pid)], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let output = ''
  let requested = false
  let failure: string | undefined
  const LIMIT = 20_000
  const signal = AbortSignal.timeout(LIMIT)
  const marker = 'POFFO_RUNTIME_STATE'
  const expression = [
    `JSON.stringify({marker:'${marker}',`,
    'resources:process.getActiveResourcesInfo(),',
    'handles:process.report.getReport().libuv})',
  ].join('')
  try {
    await new Promise<void>((resolve, reject) => {
      const aborted = () => reject(signal.reason)
      signal.addEventListener('abort', aborted, {once: true})
      const read = (chunk: Buffer) => {
        output += chunk.toString()
        if (!requested && output.includes('debug>')) {
          requested = true
          debuggerProcess.stdin.write(`exec ${expression}\n`)
        }
        if (requested && output.includes(marker) && output.trimEnd().endsWith('debug>')) {
          signal.removeEventListener('abort', aborted)
          resolve()
        }
      }
      debuggerProcess.stdout.on('data', read)
      debuggerProcess.stderr.on('data', read)
      debuggerProcess.once('error', reject)
      debuggerProcess.once('exit', (code) =>
        reject(new Error(`Diagnostic debugger exited: ${code}`)),
      )
    })
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error)
  } finally {
    if (debuggerProcess.exitCode === null && debuggerProcess.signalCode === null) {
      const exited = once(debuggerProcess, 'exit', {signal: AbortSignal.timeout(LIMIT)})
      debuggerProcess.kill('SIGTERM')
      await exited.catch((error: unknown) => {
        failure ??= String(error)
      })
    }
  }
  await mkdir(dirname(path), {recursive: true})
  await writeFile(
    path,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        failure,
        inspectorAddedAfterFailure: true,
        output: output.replace(/ws:\/\/\S+/gu, '[inspector endpoint]'),
        pid,
        stage,
      },
      null,
      2,
    ),
  )
}
