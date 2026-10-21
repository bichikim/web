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
      'Codex CLI is missing. Install it globally with npm install -g @openai/codex? [y/N]: ',
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
    child.once('error', (cause) => reject(new Error('Could not run npm.', {cause})))
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `Codex CLI installation failed (exit code: ${code}). Check npm permissions and network settings.`,
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
        `CODEX_BINARY executable not found: ${options.codex}. Correct the path or unset CODEX_BINARY.`,
        {cause: error},
      )
    }
  }
  if (!options.installCodex) {
    if (!options.interactive) {
      throw new Error(
        'Codex CLI is missing. Run npm install -g @openai/codex or retry with install --install-codex.',
      )
    }
    if (!(await confirmInstallation())) {
      throw new Error('Installation was not started. Codex CLI is required.')
    }
  }
  await installCli()
  try {
    await verify()
  } catch (cause) {
    throw new Error(
      'Could not run Codex CLI after installation. Add the npm global bin directory to PATH or set CODEX_BINARY.',
      {cause},
    )
  }
}
