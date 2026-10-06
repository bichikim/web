# Code Viewer

Codex 대화 옆에서 코드를 읽고, import 경로나 심볼을 클릭해 파일과 정의로 이동하는 플러그인입니다. 선택한 코드의 파일·줄·열 정보를 채팅에 추가할 수 있습니다.

## 설치하기

[Node.js](https://nodejs.org/en/download) 24 이상, npm, 최신 Codex 데스크톱 앱과 [Codex CLI](https://developers.openai.com/codex/cli)가 필요합니다. `codex` 명령이 없거나 `plugin` 하위 명령을 지원하지 않으면 먼저 CLI를 설치·업데이트하세요.

```sh
npm install -g @openai/codex
```

터미널에서 아래 두 명령을 실행하세요.

```sh
codex plugin marketplace add bichikim/web --ref '@winter-love/codex-code-viewer@0.1.0' --sparse .agents/plugins --json
codex plugin add codex-code-viewer@winter-love-plugins --json
```

첫 명령은 GitHub의 플러그인 목록을 등록하고, 두 번째 명령은 공개 npm 패키지 [`@winter-love/codex-code-viewer`](https://www.npmjs.com/package/@winter-love/codex-code-viewer)를 내려받아 Codex에 설치합니다. ZIP 다운로드, 압축 해제, 저장소 빌드, 별도 미리보기 서버 실행은 필요하지 않습니다. 공개 패키지 설치에는 npm 로그인이 필요하지 않습니다.

설치 후 Codex 앱을 완전히 종료하고 다시 여세요. 프로젝트 대화의 오른쪽 패널에서 새 탭 목록의 **Code Viewer**를 선택한 다음, 처음 볼 파일의 **절대 경로**를 입력하고 Enter를 누르세요. 예: `/Users/사용자명/projects/my-project/src/main.tsx`.

이후 import 경로나 심볼을 클릭해 이동할 수 있습니다. 코드를 선택하고 **채팅창에 추가**를 누르면 파일과 범위가 다음 채팅의 참고 정보에 추가됩니다. 기본 파일 뷰어의 **열기** 메뉴는 외부 앱 실행 메뉴입니다.

업데이트할 때는 위 첫 명령의 `--ref`를 새 릴리스 태그로 바꾸고 두 명령을 다시 실행하세요. 설치 상태는 `codex plugin list --json`으로 확인할 수 있습니다.

설치 방식은 [공식 npm 플러그인·마켓플레이스 안내](https://developers.openai.com/plugins/build/plugins#marketplace-metadata)를 따릅니다. 이 GitHub 마켓플레이스를 직접 등록하는 방식이며, OpenAI 공식 목록에 등재되는 것은 별도 절차입니다.

## 사용

- 파일 진입점으로 실행되면 Codex 호스트가 전달한 파일 경로를 사용한다. 입력창 하나에서 파일 경로와 검색어를 받는다. 입력 내용에 지원 파일의 절대·상대 경로가 있으면 Enter 또는 **파일 열기**로 연다. `경로:줄:열` 주소와 문장에 포함된 경로도 인식한다. 파일을 처음 열 때는 절대 경로가 필요하며, 다른 절대 경로로 열면 작업 폴더와 이동 기록을 새로 시작한다.
- import 문자열 클릭: 해당 모듈 파일 열기. 상대 경로, barrel의 `index.ts`, tsconfig의 `paths`를 해석한다.
- 심볼 클릭: TypeScript Language Service로 정의 파일과 줄 찾기. 정의가 여러 개면 선택 목록을 표시한다.
- 뒤로/앞으로: 이전 파일과 줄로 이동한다. 실패한 이동은 기록을 바꾸지 않는다.
- 경로 없이 파일명이나 검색어만 입력하면 작업 폴더 안의 지원 파일을 검색한다. 결과를 클릭하거나 위·아래 방향키로 고른 뒤 Enter로 연다. `Cmd/Ctrl+P`는 같은 입력창을 선택하고 `Esc`는 검색 결과를 닫는다.
- `Alt+←/→`: 뒤로/앞으로 이동한다.
- `Cmd/Ctrl+F`: 현재 파일 안에서 문자열을 찾는다. 대소문자를 구분하지 않는 문자 그대로의 검색이며 결과를 코드 위에 강조한다. `Enter`·`Shift+Enter` 또는 이전·다음 버튼으로 결과를 순환하고 `Esc`로 닫는다. 선택한 한 줄 안의 텍스트가 있으면 검색어로 사용한다. 검색 결과로 이동해도 채팅에 추가할 줄 선택은 유지한다.
- 코드 영역 우클릭 또는 줄 번호에서 `Shift+F10`: **코드 복사**, **채팅창에 추가**, **파일 내 검색** 메뉴를 연다. 선택한 텍스트 위를 우클릭하면 그 범위를 유지한다. 코드 토큰을 우클릭하면 해당 토큰의 정확한 줄·열 범위를 사용한다. 줄 번호나 줄의 빈 부분을 우클릭하면 기존 범위 안에 있어도 해당 줄을 선택하며, 줄 밖의 빈 공간에서는 기존 선택을 유지한다. 메뉴를 여는 순간의 범위를 저장하므로 메뉴 포커스가 텍스트 선택을 풀어도 첨부 범위는 바뀌지 않는다. 복사할 때 줄 번호는 제외한다. 메뉴에서 위·아래 방향키와 `Home`·`End`로 이동하고 `Esc`로 닫는다.
- 줄 번호 클릭: 해당 줄을 선택한다. 줄 번호에서 드래그하거나 `Shift`를 누른 채 다른 줄 번호를 클릭하면 범위를 선택한다. 선택한 줄은 배경으로 강조하고 아래의 코드 주소도 갱신한다. 줄 번호에 포커스를 둔 상태에서 위·아래 방향키, `Home`·`End`로 이동하며 `Shift`로 범위를 확장한다. 선택은 파일 재요청이나 이동 기록 추가 없이 화면에서 처리한다.
- 코드 본문의 텍스트를 드래그하면 시작·끝 줄과 열을 선택한다. 주소의 열은 UTF-16 기준이고 끝 위치는 선택에 포함되지 않는다. 예를 들어 `5:3-5:7`은 5번째 줄의 3~6번째 열이다. 브라우저의 텍스트 선택과 복사를 유지하며 주소와 줄 강조를 함께 갱신한다. 선택 드래그는 import나 심볼 이동으로 처리하지 않는다.
- 채팅창에 추가: 선택한 파일과 줄 또는 정확한 텍스트 범위를 다음 채팅 메시지의 참고 정보에 추가한다. 반복해서 추가한 범위는 Code Viewer 컨텍스트 하나에 순서대로 누적하며, 서로 다른 파일의 범위도 유지한다. 호스트가 컨텍스트를 소비하거나 제거했다는 알림을 받으면 누적 목록을 비운다. 입력란에 텍스트를 쓰거나 메시지를 자동 전송하지 않는다.
- 오류와 완료 안내는 둥근 토스트로 표시하며 5초 뒤 자동으로 닫힌다. 새 알림은 같은 내용이어도 수명을 다시 시작한다. 토스트에 마우스를 올리거나 키보드 포커스를 두면 자동 닫기를 잠시 멈춘다. 닫기 버튼 또는 `Esc`로도 닫을 수 있다. 하단의 선택 주소는 안내 문구로 바꾸지 않는다. 토스트가 떠 있어도 코드 선택과 파일 이동을 계속 할 수 있다.
- 파일 변경 알림과 뷰어 포커스 복귀 시 현재 파일을 다시 읽는다. 이전 내용으로 계산한 이동 요청은 거절한다.
- 호스트가 전달한 밝음·어두움 테마, 배경·글자·테두리 색상과 글꼴을 사용하며 테마 변경 이벤트도 반영한다. 호스트가 색상을 전달하지 않으면 해당 밝음·어두움 기본값을 사용한다. 표준 호스트 컨텍스트에는 코드 구문 강조 테마의 전체 팔레트가 없으므로 구문 강조는 별도 팔레트를 사용한다.
- 라운드, 그림자, UI 글자 크기와 굵기도 호스트 디자인 값을 사용한다. 값이 없으면 12px 컨트롤·16px 입력 영역·20px 검색 영역과 옅은 그림자를 기본값으로 사용한다. 도구 모음은 선형 아이콘과 둥근 호버 영역을 사용한다.
- 입력창은 호버 시 배경과 테두리를 옅게 강조하며, 포커스 시 별도의 테두리나 링을 추가하지 않는다. 버튼의 호버·눌림 스타일은 활성 상태에만 적용한다. 상태 전환은 150ms이며 동작 줄이기 환경에서는 전환 효과를 끈다.

지원 확장자는 `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`이다. 작업 폴더는 처음 연 파일의 상위 `.git` 또는 `pnpm-workspace.yaml` 디렉터리로 정한다. 코드 파일을 실행하거나 수정하지 않는다. 단일 파일은 512KiB까지 읽으며 작업 폴더 밖, 숨김 파일, `.git`, `.codex`, `.aws`, `.ssh` 경로는 열지 않는다. 검색은 생성물과 `node_modules`를 제외하고 최대 10,000개 파일에서 100개 결과를 표시한다.

## 빌드와 로컬 설치

이 절은 소스에서 개발하거나 빌드하는 사람을 위한 안내다. 일반 사용자는 위의 설치 절차만 따르면 된다. Solid와 UnoCSS를 사용하며 React 의존성은 없다. 루트 `.pnpmfile.cjs`는 이 패키지에서 사용하는 MCP SDK 1.7.5의 선택적 React peer만 제외한다.

저장소 의존성을 설치한 뒤 이 패키지 디렉터리에서 실행한다. Node 24 이상이 필요하다.

```sh
node --import tsx build.ts
codex plugin marketplace add "$PWD/dist" --json
codex plugin add codex-code-viewer@winter-love-code-viewer --json
```

`dist/plugin`은 서버, HTML, TypeScript 표준 선언 파일, `.codex-plugin/plugin.json`, `.mcp.json`을 포함한 설치용 묶음이다. 실행 시 별도 npm 설치가 필요하지 않다. `dist/.agents/plugins/marketplace.json`은 이 묶음을 가리키는 로컬 카탈로그다. 새 `package.json` 스크립트는 추가하지 않았다.

설치본은 공식 문서가 지원하는 Codex 호환 레이아웃을 사용한다. 초기 구현의 루트 `plugin.json`과 `extensions.com.openai.mcpServers` 조합은 설치 목록에 표시됐지만, 앱에 포함된 CLI 0.158.0-alpha.2.1의 `plugin/read` 결과에서 서버 목록이 비어 있었다. 호환 레이아웃으로 수정한 뒤에는 CLI 0.158.0-alpha.2.1과 현재 로컬 런타임 0.160.0 모두 서버와 8개 도구를 발견했다. 빌드는 이전 설치용 묶음을 먼저 비워 잘못된 루트 manifest가 남지 않게 한다.

설치나 갱신 후 Codex 앱을 다시 열어 대화 오른쪽 패널의 새 탭 목록에서 **Code Viewer**를 확인한다. 대화 패널 진입점은 [공식 확장 문서](https://developers.openai.com/plugins/build/extensions)의 `thread` 계약을 따른다. 설치된 Codex 26.924.22138의 소스에는 오른쪽 패널 메뉴에서 `thread` 도구를 표시하는 처리와 `file` 도구에 호스트 파일 경로를 전달하는 처리가 있다. 실제 화면의 표시와 파일 연결은 아직 검증하지 못했다.

파일 패널 오른쪽 위의 **열기 옆 메뉴는 외부 앱 실행 메뉴**이며, Code Viewer를 선택하는 메뉴가 아니다. `file` 진입점도 선언했지만, 기본 `.tsx` 뷰어 교체는 검증되지 않았다. 패키징은 [OpenAI 플러그인 문서](https://developers.openai.com/plugins/build/plugins)를 따른다.

코드를 바꾼 뒤에는 다시 빌드하고 `codex plugin add codex-code-viewer@winter-love-code-viewer --json`을 실행해 설치 사본을 갱신한다. 데스크톱이 사용 중인 서버를 다시 읽으려면 앱을 다시 열어야 할 수 있다.

## npm 배포

소스 패키지는 `private: true`로 유지한다. 빌드는 npm에 배포할 독립 패키지를 `dist/plugin`에 생성한다. 이 패키지는 런타임 의존성과 설치 스크립트가 없으며 필요한 실행 파일과 라이선스 고지를 포함한다. `dist`는 Git에 포함하지 않는다.

```sh
node --import tsx build.ts
npm pack ./dist/plugin --pack-destination ./dist
# tarball 내용과 독립 실행을 검증한 뒤 배포
npm publish ./dist/winter-love-codex-code-viewer-0.1.0.tgz --access public
```

새 버전은 소스 `package.json`, 플러그인 manifest, 저장소 루트 `.agents/plugins/marketplace.json`의 npm 버전을 함께 갱신한다. 이 독립 번들은 현재 모노레포 `Release packages` Action의 대상이 아니다. 배포 소스와 태그는 저장소 [릴리스 규칙](../../RELEASE.md)을 따른다. npm 배포가 성공한 뒤 같은 소스 커밋에 `@winter-love/codex-code-viewer@버전` 태그를 만들고 push한다. 설치 명령의 `--ref`도 해당 태그로 갱신한다.

## 브라우저 미리보기

```sh
node --import tsx preview.ts /absolute/path/to/file.tsx
# 파일을 자동으로 열지 않고 대화 탭의 빈 시작 화면으로 검증
node --import tsx preview.ts /absolute/path/to/file.tsx --panel
```

출력 URL을 Codex 브라우저에서 연다. 임의 토큰 경로를 가진 loopback 서버가 실제 빌드된 stdio MCP 서버와 AppBridge를 연결한다. 네이티브 파일 도구 입력과 호스트 경로 메타데이터를 전달하여 동일한 뷰어를 실행한다. 상단의 **호스트 테마** 선택으로 실제 브리지의 테마 변경 이벤트를 검증할 수 있다. 다시 빌드한 뒤 같은 주소를 새로고침하면 최신 UI를 읽는다. `Ctrl+C`로 종료한다. 상단의 **채팅 컨텍스트 미리보기**를 펼치면 호스트가 받은 모든 범위를 확인할 수 있다. **컨텍스트 비우기**로 호스트의 소비·제거 이벤트를 검증한다. 네이티브 뷰어 메뉴 등록 여부나 개별 첨부 칩의 표시를 대신 검증하는 것은 아니다.

## 검증과 한계

```sh
pnpm exec vitest run --config vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.json
```

통합 테스트는 별칭/barrel 해석, 의존 파일 변경, 경로 제한, MCP 대화/파일 진입점, 누락된 호스트 경로, 오래된 코드 위치 거절을 검증한다. 뷰어 테스트는 첫 파일 열기, 실패한 이동 후 기록 보존, 포커스 갱신과 클릭의 경합, 검색 응답 순서, 초기 테마 적용과 변경 이벤트를 검증한다. 현재 검증 결과는 릴리스별로 기록한다. 브라우저의 실제 AppBridge에서도 밝음·어두움 전환에 따라 뷰어 색상이 바뀌는 것을 확인했다.

브라우저에서 빈 대화 패널로 시작해 Puppet의 실제 `main.tsx`를 경로 입력으로 열고 `PuppetEditor` 정의의 127번째 줄로 이동하는 것을 확인했다. 네이티브 Codex의 탭 선택 UI와 기본 `.tsx` 뷰어 교체는 앱 자동 조작 제한으로 확인하지 못했다.

패키징 수정 후 실제 데스크톱 CLI 0.160.0의 `mcpServerStatus/list`에서 `toolsError: null`, `code.panel`의 `thread` 메타데이터, `code.file`의 `file` 메타데이터와 HTML 리소스를 확인했다. `mcpServer/resource/read`로 뷰어 HTML을 읽었다. 이 결과는 서버 발견과 UI 리소스 로딩을 검증하며, 네이티브 화면의 렌더링이나 파일 연결 성공을 대신 증명하지 않는다.

TypeScript 해석은 처음 연 파일에 가까운 tsconfig를 사용한다. 서로 다른 tsconfig를 가진 패키지로 이동했을 때 그 패키지 고유 별칭은 새 파일로 뷰어를 다시 열어야 한다. 번들러 전용 alias, 브라우저 public URL, 계산된 동적 경로는 완전히 해석하지 않는다. pnpm symlink가 작업 폴더 밖의 전역 store를 가리키면 해당 의존성 정의는 열리지 않는다. 자동완성, 코드 편집, rename/refactor는 포함하지 않는다.
