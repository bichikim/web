import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {resolveCodexCommand} from './resolve-codex-command'

export interface RunCodexOptions {
  /** Codex CLI에 순서대로 전달할 인수. */
  args: string[]
  /** PATH에서 찾을 CLI 명령 또는 직접 실행할 파일 경로. Windows npm shim도 지원한다. */
  codex: string
  /** 이 실행에서 CODEX_HOME으로 사용할 설정 폴더. */
  home: string
  /** stderr가 도착할 때 원문을 전달한다. 생략하면 출력은 실패 진단에만 사용한다. */
  onStderr?: (output: string) => void
}
const execute = promisify(execFile)
const MAX_OUTPUT_BYTES = 4194304

/** Runs Codex in the selected configuration directory, streaming stderr and returning stdout. */
export const runCodex = async (options: RunCodexOptions): Promise<string> => {
  try {
    const command = await resolveCodexCommand(options.codex)
    const pending = execute(command.binary, [...command.args, ...options.args], {
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
