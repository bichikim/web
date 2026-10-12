import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

export interface RunCodexOptions {
  args: string[]
  codex: string
  home: string
  onStderr?: (output: string) => void
}
const execute = promisify(execFile)
const MAX_OUTPUT_BYTES = 4194304

/** Runs Codex in the selected configuration directory, streaming stderr and returning stdout. */
export const runCodex = async (options: RunCodexOptions): Promise<string> => {
  try {
    const pending = execute(options.codex, options.args, {
      env: {...process.env, CODEX_HOME: options.home},
      maxBuffer: MAX_OUTPUT_BYTES,
    })
    if (options.onStderr !== undefined) {
      pending.child.stderr?.setEncoding('utf8').on('data', options.onStderr)
    }
    const result = await pending
    return result.stdout
  } catch (error) {
    const detail =
      error instanceof Error && 'stderr' in error && typeof error.stderr === 'string'
        ? error.stderr.trim() || error.message
        : error instanceof Error
          ? error.message
          : String(error)
    throw new Error(`Codex CLI 명령을 실행하지 못했습니다: ${detail}`, {cause: error})
  }
}
