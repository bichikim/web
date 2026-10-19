import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {homedir} from 'node:os'
import {join, resolve} from 'node:path'
import {type PluginUpdate, versionSchema} from '../shared/plugin-updates'
import {installPlugin} from '../installer/install-plugin'
import {withUpdateLock} from './with-update-lock'

const execute = promisify(execFile)

/** 확인한 npm 버전을 현재 호스트의 설치기와 프로필로 설치한다. */
export const runPluginUpdate = async (
  version: string,
  target: PluginUpdate['target'],
): Promise<void> => {
  const checked = versionSchema.parse(version)
  if (target === 'codex') {
    const home = resolve(process.env.CODEX_HOME || join(homedir(), '.codex'))
    await withUpdateLock(home, () =>
      installPlugin({
        codex: process.env.CODEX_BINARY ?? 'codex',
        home,
        version: checked,
      }),
    )
    return
  }
  const home = resolve(homedir(), process.env.CLAUDE_CONFIG_DIR || '.claude')
  await withUpdateLock(home, async () => {
    await execute(
      'npx',
      [
        '--yes',
        '--registry=https://registry.npmjs.org',
        `@winter-love/codex-code-viewer@${checked}`,
        'install',
        '--target',
        target,
      ],
      {
        cwd: homedir(),
        env: process.env,
        maxBuffer: 4_194_304,
      },
    )
  })
}
