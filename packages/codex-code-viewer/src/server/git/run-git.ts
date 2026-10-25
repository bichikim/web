import {execFile} from 'node:child_process'
import {isUtf8} from 'node:buffer'

export interface GitOutput {
  readonly ok: boolean
  readonly output: string
  readonly validUtf8: boolean
}
const MAX_OUTPUT_BYTES = 4194304

/** Runs Git without shell expansion, optional index writes, external diff drivers or fsmonitor hooks. */
export const runGit = (
  root: string,
  arguments_: readonly string[],
  signal?: AbortSignal,
  maxBuffer = MAX_OUTPUT_BYTES,
): Promise<GitOutput> =>
  new Promise((resolve, reject) => {
    execFile(
      'git',
      [
        '--no-optional-locks',
        '--literal-pathspecs',
        '-c',
        'core.fsmonitor=false',
        '-C',
        root,
        ...arguments_,
      ],
      {encoding: 'buffer', maxBuffer, signal, windowsHide: true},
      (error, stdout) => {
        if (signal?.aborted) {
          reject(signal.reason)
        } else if (error === null) {
          resolve({ok: true, output: stdout.toString('utf8'), validUtf8: isUtf8(stdout)})
        } else if (typeof error.code === 'number' || error.code === 'ENOENT') {
          resolve({ok: false, output: '', validUtf8: true})
        } else {
          reject(error)
        }
      },
    )
  })
