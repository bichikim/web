import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {createClaudeEnvironment} from './create-claude-environment'

export interface RunClaudeOptions {
  readonly binary: string
  readonly home: string
  readonly args: readonly string[]
  readonly onStderr?: (output: string) => void
}
const execute = promisify(execFile)

/** Runs the official Claude CLI against the selected user configuration. */
export const runClaude = async (options: RunClaudeOptions): Promise<string> => {
  try {
    const pending = execute(options.binary, [...options.args], {
      env: createClaudeEnvironment({
        defaultHome: join(homedir(), '.claude'),
        environment: process.env,
        home: options.home,
      }),
      maxBuffer: 4_194_304,
    })
    pending.child.stderr
      ?.setEncoding('utf8')
      .on('data', (output: string) => options.onStderr?.(output))
    return (await pending).stdout
  } catch (error) {
    const detail =
      error instanceof Error && 'stderr' in error && typeof error.stderr === 'string'
        ? error.stderr.trim() || error.message
        : error instanceof Error
          ? error.message
          : String(error)
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
    const guidance = missing
      ? '\nhttps://code.claude.com/docs/en/setup 에서 Claude CLI를 설치하세요.'
      : ''
    throw new Error(`Claude CLI 실행 실패: ${detail}${guidance}`, {cause: error})
  }
}
