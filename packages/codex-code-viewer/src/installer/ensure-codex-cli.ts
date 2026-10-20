import {spawn} from 'node:child_process'
import {stdin, stdout} from 'node:process'
import {createInterface} from 'node:readline/promises'
import {runCodex} from './run-codex'

interface EnsureCodexCliOptions {
  /** 실행할 Codex CLI 이름 또는 경로입니다. */
  readonly codex: string
  /** CLI 확인에 사용할 Codex 설정 폴더입니다. */
  readonly home: string
  /** 터미널에서 설치 동의를 물을 수 있는지 나타냅니다. */
  readonly interactive: boolean
  /** 누락된 CLI의 전역 npm 설치에 명시적으로 동의했는지 나타냅니다. */
  readonly installCodex: boolean
}

const confirmInstallation = async (): Promise<boolean> => {
  const prompt = createInterface({input: stdin, output: stdout})
  try {
    const answer = await prompt.question(
      'Codex CLI가 없습니다. npm install -g @openai/codex로 전역 설치할까요? [y/N]: ',
    )
    return ['y', 'yes'].includes(answer.trim().toLowerCase())
  } finally {
    prompt.close()
  }
}

const installCli = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const windows = process.platform === 'win32'
    const child = spawn(windows ? 'npm.cmd' : 'npm', ['install', '-g', '@openai/codex'], {
      shell: windows,
      stdio: 'inherit',
    })
    child.once('error', (cause) => reject(new Error('npm을 실행하지 못했습니다.', {cause})))
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `Codex CLI 설치 실패 (종료 코드: ${code}). npm 권한·네트워크 설정을 확인하세요.`,
          ),
        )
      }
    })
  })

/** 기존 CLI를 확인하고, 누락된 경우 동의를 받아 설치한 뒤 실행 가능 여부를 확인합니다. */
export const ensureCodexCli = async (options: EnsureCodexCliOptions): Promise<void> => {
  const verify = () => runCodex({...options, args: ['--version']})
  try {
    await verify()
    return
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined
    if (!(cause instanceof Error && 'code' in cause && cause.code === 'ENOENT')) {
      throw error
    }
    if (options.codex !== 'codex') {
      throw new Error(
        `CODEX_BINARY 실행 파일을 찾을 수 없습니다: ${options.codex}. 경로를 수정하거나 설정을 해제하세요.`,
        {cause: error},
      )
    }
  }
  if (!options.installCodex) {
    if (!options.interactive) {
      throw new Error(
        'Codex CLI가 없습니다. npm install -g @openai/codex를 실행하거나 install --install-codex로 다시 실행하세요.',
      )
    }
    if (!(await confirmInstallation())) {
      throw new Error('설치를 시작하지 않았습니다. Codex CLI가 필요합니다.')
    }
  }
  await installCli()
  try {
    await verify()
  } catch (cause) {
    throw new Error(
      '설치 후 Codex CLI를 실행하지 못했습니다. npm 전역 실행 경로를 PATH에 추가하거나 CODEX_BINARY를 지정하세요.',
      {cause},
    )
  }
}
