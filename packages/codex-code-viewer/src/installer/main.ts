import {readFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join, resolve} from 'node:path'
import {z} from 'zod'
import {installPlugin} from './install-plugin'

const args = process.argv.slice(2)
const command = args[0] ?? 'install'
if ((command === '--help' || command === '-h') && args.length === 1) {
  console.log(
    [
      '사용법: npx @winter-love/codex-code-viewer@latest install',
      'CODEX_BINARY로 CLI 경로, CODEX_HOME으로 설정 디렉터리를 지정할 수 있습니다.',
    ].join('\n'),
  )
} else if (command === 'install' && args.length <= 1) {
  try {
    const manifest = z
      .object({version: z.string()})
      .parse(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')))
    await installPlugin({
      codex: process.env.CODEX_BINARY ?? 'codex',
      home: resolve(process.env.CODEX_HOME || join(homedir(), '.codex')),
      version: manifest.version,
    })
    console.log(
      `Code Viewer ${manifest.version} 설치 완료. Codex 앱을 완전히 종료하고 다시 열어 주세요.`,
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
} else {
  console.error(
    '지원하지 않는 명령입니다. npx @winter-love/codex-code-viewer@latest install을 사용하세요.',
  )
  process.exitCode = 1
}
