import {execFile} from 'node:child_process'
import {createRequire} from 'node:module'
import {platform} from 'node:os'
import {extname, join, resolve} from 'node:path'
import {promisify} from 'node:util'

export interface CodexCommand {
  readonly binary: string
  readonly args: readonly string[]
}

const execute = promisify(execFile)

const findWindowsCommand = async (codex: string): Promise<string> => {
  if (/[\\/]/u.test(codex)) {
    return resolve(codex)
  }
  try {
    const result = await execute(
      join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'where.exe'),
      [codex],
    )
    return result.stdout.split(/\r?\n/u).find((line) => line.length > 0) ?? codex
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 1) {
      return codex
    }
    throw error
  }
}

/** npm Codex의 Windows shim을 Node 실행 파일과 launcher로 해석해 셸 없이 실행할 수 있게 한다. */
export const resolveCodexCommand = async (codex: string): Promise<CodexCommand> => {
  if (platform() !== 'win32') {
    return {args: [], binary: codex}
  }
  const binary = await findWindowsCommand(codex)
  if (extname(binary).toLowerCase() !== '.cmd') {
    return {args: [], binary}
  }
  try {
    const launcher = createRequire(resolve(binary)).resolve('@openai/codex/bin/codex.js')
    return {args: [launcher], binary: process.execPath}
  } catch (error) {
    throw new Error(
      'Windows npm Codex 실행 파일을 찾지 못했습니다. CODEX_BINARY에 codex.exe 경로를 지정하세요.',
      {cause: error},
    )
  }
}
