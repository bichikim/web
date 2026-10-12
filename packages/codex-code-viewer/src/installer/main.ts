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
    const progress = {
      cleaning: '[4/4] 이전 버전 정리 중…',
      installing: '[3/4] Code Viewer 다운로드 및 설치 중…',
      preparing: '[1/4] 설치 준비 중…',
      registering: '[2/4] Marketplace 등록 중…',
      restoring: '설치 설정 복원 중…',
    }
    console.error(`Code Viewer ${manifest.version} 설치를 시작합니다.`)
    await installPlugin({
      codex: process.env.CODEX_BINARY ?? 'codex',
      home: resolve(process.env.CODEX_HOME || join(homedir(), '.codex')),
      onProgress: (stage) => {
        console.error(progress[stage])
      },
      onStderr: (output) => {
        process.stderr.write(output)
      },
      version: manifest.version,
    })
    console.log(
      `Code Viewer ${manifest.version} 설치 완료. Codex 앱을 완전히 종료하고 다시 열어 주세요.`,
    )
  } catch (error) {
    console.error(
      `Code Viewer 설치 실패: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 1
  }
} else {
  console.error(
    '지원하지 않는 명령입니다. npx @winter-love/codex-code-viewer@latest install을 사용하세요.',
  )
  process.exitCode = 1
}
