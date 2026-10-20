import {readFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {z} from 'zod'
import {parseInstallCommand} from './parse-install-command'
import {chooseInstallTarget} from './choose-install-target'
import {installTargets} from './install-targets'

const onStderr = (output: string) => {
  process.stderr.write(output)
}
try {
  const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true
  const command = parseInstallCommand(process.argv.slice(2), interactive)
  if (command.command === 'help') {
    console.log(
      [
        '사용법: npx @winter-love/codex-code-viewer@latest install [--target codex|claude|all] [--install-codex]',
        '터미널에서는 Codex·Claude Desktop(Code 모드)·둘 다를 선택합니다.',
        '비대화형 기본 대상은 Codex입니다. Claude는 현재 macOS Apple Silicon을 지원합니다.',
        'Codex CLI가 없으면 설치 여부를 묻습니다. --install-codex는 전역 npm 설치에 미리 동의합니다.',
        'CODEX_BINARY / CODEX_HOME: Codex CLI와 설정 폴더',
        'CLAUDE_BINARY / CLAUDE_CONFIG_DIR: Claude CLI와 설정 폴더',
        'CODE_VIEWER_RUNTIME_ARCHIVE: 같은 버전·SHA-256의 오프라인 Claude 런타임 ZIP',
      ].join('\n'),
    )
  } else {
    const target = command.target === 'choose' ? await chooseInstallTarget() : command.target
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
    const results = await installTargets({
      claude: {
        binary: process.env.CLAUDE_BINARY ?? 'claude',
        home: resolve(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')),
        onProgress: (stage) => console.error(stage),
        onStderr,
        packageRoot: fileURLToPath(new URL('../', import.meta.url)),
        runtimeArchive: process.env.CODE_VIEWER_RUNTIME_ARCHIVE,
        version: manifest.version,
      },
      codex: {
        codex: process.env.CODEX_BINARY ?? 'codex',
        home: resolve(process.env.CODEX_HOME || join(homedir(), '.codex')),
        onProgress: (stage) => console.error(progress[stage]),
        onStderr,
        version: manifest.version,
      },
      installCodex: command.installCodex,
      interactive,
      target,
    })
    for (const result of results) {
      switch (result.target) {
        case 'codex':
          console.log(
            `Code Viewer ${manifest.version} 설치 완료. Codex 앱을 완전히 종료하고 다시 열어 주세요.`,
          )
          break
        case 'claude':
          console.log(
            [
              `Claude Code Viewer ${manifest.version} 설치 완료. MCP는 플러그인에 함께 등록됐습니다.`,
              '원클릭 첨부·접힌 Browser 펼치기: 시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용에서 아래 앱을 추가·허용하세요.',
              result.application,
              '허용해도 권한 오류가 계속되면 기존 Code Viewer Attachment 항목만 제거하고 위 앱을 다시 추가하세요.',
              'Claude Desktop의 Code 탭에서 새 로컬 세션을 연 뒤 입력창 아래 「코드 뷰어 열기」 또는 답변의 파일 링크를 누르세요.',
              '버튼이 없으면 Desktop을 업데이트하세요(내장 Claude Code 2.1.286 이상). 기존 세션은 재로드하지 않았습니다.',
            ].join('\n'),
          )
          break
      }
    }
  }
} catch (error) {
  console.error(`Code Viewer 설치 실패: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
