import {ensureCodexCli} from './ensure-codex-cli'
import {installPlugin} from './install-plugin'
import {installClaudePlugin} from './install-claude-plugin'
import type {InstallTarget} from './parse-install-command'

interface InstallTargetsOptions {
  /** 누락된 Codex CLI를 묻지 않고 설치합니다. 생략하면 사전 동의하지 않습니다. */
  readonly installCodex?: boolean
  /** 설치 동의를 터미널에서 물을 수 있는지 나타냅니다. 생략하면 묻지 않습니다. */
  readonly interactive?: boolean
  readonly target: InstallTarget
  readonly codex: Parameters<typeof installPlugin>[0]
  readonly claude: Parameters<typeof installClaudePlugin>[0]
}
interface CodexInstallation {
  readonly target: 'codex'
}
interface ClaudeInstallation {
  readonly target: 'claude'
  readonly application: string
}
export type Installation = CodexInstallation | ClaudeInstallation

/** Installs selected hosts in order and reports completed work when another target fails. */
export const installTargets = async (
  options: InstallTargetsOptions,
): Promise<readonly Installation[]> => {
  if (options.target !== 'claude') {
    await ensureCodexCli({
      codex: options.codex.codex,
      home: options.codex.home,
      installCodex: options.installCodex ?? false,
      interactive: options.interactive ?? false,
    })
  }
  switch (options.target) {
    case 'codex':
      await installPlugin(options.codex)
      return [{target: 'codex'}]
    case 'claude':
      return [{application: await installClaudePlugin(options.claude), target: 'claude'}]
    case 'all': {
      await installPlugin(options.codex)
      try {
        return [
          {target: 'codex'},
          {application: await installClaudePlugin(options.claude), target: 'claude'},
        ]
      } catch (error) {
        throw new Error(
          `Codex 설치 완료. Claude 설치 실패: ${error instanceof Error ? error.message : String(error)}`,
          {cause: error},
        )
      }
    }
  }
}
