import {installPlugin} from './install-plugin'
import {installClaudePlugin} from './install-claude-plugin'
import type {InstallTarget} from './parse-install-command'

interface InstallTargetsOptions {
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
