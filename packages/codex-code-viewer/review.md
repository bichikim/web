# Code Viewer 검토·수정 결과

2026-10-06 · `critical-review-fix-loop`

## 범위와 결과

현재 작업의 `packages/codex-code-viewer` 전체 구현·테스트·빌드·미리보기·플러그인 manifest와 관련된 루트 의존성 변경을 검토했다. 동작, 리팩터링, 명명·파일 배치의 세 관점을 모두 검토했다. 다른 앱의 구현 변경은 범위 밖이다.

P0/P1은 발견하지 않았다. P2는 공통 원인별로 5건을 발견해 모두 수정했다. 최종 검토 범위에서 **no remaining P0/P1/P2 findings**. 아래 네 차례 검토와 실행한 검증을 근거로 판단하며, 네이티브 화면의 미검증 범위는 별도로 남긴다. PR은 생성하거나 갱신하지 않았다.

## 수정한 P2

### P2-1. 한글·문장부호·공백 경로가 검색어 또는 다른 경로로 해석됨

- 원인: 상대 경로의 첫 디렉터리를 ASCII 문자로 제한했고, 문장 속 경로를 공백에서 끊었다. 따옴표 안의 전체 경로도 먼저 해석하지 않았다.
- 수정 전: `한글/파일.tsx:3`과 `apps+tools/main.tsx`는 검색어로 분류됐다. `위치: "/Users/bichi/My Project/main.tsx:8:1"`은 `Project/main.tsx`로 잘렸다. 따옴표로 감싼 상대 경로 `My Project/main.tsx`도 같은 문제가 남아 재검토에서 수정했다. 유효한 파일을 못 열거나 다른 파일을 요청하는 영향이 있었다.
- 수정: [경로 파서](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/parse-file-input.ts:5)는 경로 구분 문자를 기준으로 첫 디렉터리를 인식하고, 따옴표 안의 경로는 공백을 보존한다. 파일명만 입력하면 검색하는 기존 계약을 유지했다.
- 검증: [회귀 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/parse-file-input.spec.ts:39)에서 네 입력의 전체 경로·줄·열을 확인했다. 브라우저에서도 한글 경로와 문장 속 공백 경로가 **파일 열기**로 인식됐다. 공백 경로의 실제 파일 읽기는 이 테스트에서 주장하지 않는다.

### P2-2. 토스트 닫기 후 검색·이동 단축키가 작동하지 않음

- 원인: 키보드 이벤트를 `<main>`에서만 받았다. 포커스가 있던 닫기 버튼이 제거되면 포커스가 `BODY`로 이동해 이벤트가 `<main>`을 거치지 않았다.
- 수정 전: 실제 브라우저에서 토스트 닫기 후 `BODY` 포커스 상태의 `Cmd+P`가 입력창을 선택하지 않았다.
- 수정: [단축키 훅](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-viewer-shortcuts.ts:9)이 뷰어의 창에서 이벤트를 받고, 언마운트 시 리스너를 제거한다. IME 조합 중인 입력은 무시한다.
- 검증: [단축키 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/use-viewer-shortcuts.spec.tsx:9)가 본문 포커스, 리스너 해제, 뒤로·앞으로·닫기, IME를 검증한다. 브라우저에서도 토스트를 닫은 직후 `BODY` → `Cmd+P` → `INPUT`을 확인했고, 정의 이동 후 `Alt+←`로 원래 파일에 돌아왔다.

### P2-3. 취소된 파일 열기의 늦은 결과가 서버 세션을 남김

- 원인: 최신 요청만 반영하는 처리가 오래된 반환 값을 버렸지만, 그 요청이 서버에서 만든 세션은 닫지 않았다. 반복하면 제한된 세션 슬롯을 사용하고 기존 세션 만료에 영향을 준다.
- 수정 전: 먼저 보낸 파일 열기가 나중에 끝나는 회귀 테스트에서 `code.close` 호출이 없었다.
- 수정: [최신 요청 처리](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-latest-request.ts:12)에 폐기 결과 정리 콜백을 두고, [파일 열기](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-open-file.ts:12)가 폐기된 세션을 닫는다. 언마운트 이후 새 요청도 시작하지 않는다.
- 검증: [회귀 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/use-open-file.spec.ts:50)는 최신 파일만 전달되고 이전 세션에 `code.close`가 호출됨을 확인한다. 아래 실제 호스트 어댑터 테스트도 언마운트 후 늦은 열기 결과의 정리를 검증한다.

### P2-4. 연결 종료·초기화 실패의 정리가 누락되거나 너무 일찍 실행됨

- 원인: 연결 준비, 진행 중인 요청, 세션 정리, 화면 해제의 완료 순서를 관리하지 않았다. `start`가 나중에 완료되면 아직 끝나지 않은 세션 닫기를 기다리지 않고 연결을 종료했다. 초기화 실패 경로에는 리스너·통신 연결 정리가 없었다.
- 수정 전: 두 [연결 회귀 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/use-viewer-connection.spec.ts:19)에서 해제된 화면으로 결과가 전달되거나 세션 닫기 전에 연결 종료가 호출됐다. 재검토의 [초기화 실패 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/create-host.spec.ts:12)에서는 리스너 제거가 0회였다.
- 수정: [연결 훅](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-viewer-connection.ts:14)은 해제 후 결과를 닫고, 세션 정리가 완료된 뒤 한 번만 연결 해제를 시작한다. [호스트 어댑터](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/create-host.ts:12)는 요청과 후속 정리를 추적해 통신 연결을 마지막에 닫는다. 초기화 실패 시에도 리스너와 통신 연결을 정리한다. 타이머 없이 Promise 완료로 처리한다.
- 검증: 연결 회귀 테스트 2개, [호스트 실패·언마운트 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/create-host.spec.ts:12) 2개, 후속 작업과 거절된 작업을 검증하는 [진행 작업 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/create-pending-tasks.spec.ts:5)가 통과했다. 호스트 테스트는 실제 어댑터와 뷰어를 사용하고 SDK의 통신 경계만 대체한다. SDK 요청이 완료 또는 실패할 때까지 해제를 기다리는 비용이 있다.

### P2-5. 없는 절대 경로를 파일 읽기·권한 오류로 표시함

- 원인: 작업 폴더 생성 중 `realpath`의 파일 없음 오류가 발생하면 모두 `read-failed`로 변환했다.
- 수정 전: 없는 절대 경로의 MCP 통합 테스트가 `not-found`를 기대했지만 `read-failed`를 받았다. 사용자에게 권한이나 연결을 확인하라는 잘못된 안내가 표시됐다.
- 수정: [세션 생성 오류 처리](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/server/create-sessions.ts:28)는 `ENOENT`와 `ENOTDIR`만 `not-found`로 매핑하고 다른 읽기 오류는 유지한다.
- 검증: [MCP 통합 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/server/__tests__/create-server.integration.ts:86)가 통과했다. 새로 빌드한 stdio 서버의 실제 `code.open`도 `{code: 'not-found'}`, `isError: true`를 반환했다. 새 서버를 연결한 브라우저에서 **파일을 찾을 수 없습니다.** 토스트와 유지된 하단 주소를 확인했다.

## 검토 반복과 실행한 검증

| 검토 | 결과                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 전체 구현·계약·테스트·설정 검토. 기존 51/51 통과 후 P2 5종류를 재현했다. 첫 회귀 묶음은 57개 중 6개 실패했다.                                       |
| 2    | 수정본과 관련 호출·정리 경로를 재검토. 연결 초기화 실패의 정리 누락을 추가로 재현해 P2-4에 합쳤다.                                                  |
| 3    | 경로 입력, 요청 경합, 종료 순서, DOM 이벤트·선택, 서버 경계와 패키징을 다시 검토. 공백이 있는 상대 경로와 `+` 디렉터리 사례를 P2-1에 합쳐 수정했다. |
| 4    | 최종 구현과 회귀 테스트를 세 관점에서 재검토. 새로운 P0–P2 없음. 아래 검증 통과.                                                                    |

패키지 디렉터리에서 실행:

- `wallaby run --rerun`: **65/65 통과**, 실패·스킵 0. [최종 테스트 보고서](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/node_modules/.wallaby/e8002b8fa1878af2/reports/md/2026-10-06T11-47-25-751Z/all-tests.md:1), coverage 88.74%. Wallaby MCP가 없어 CLI를 사용했다.
- `pnpm exec tsc --noEmit -p tsconfig.json`: exit 0.
- `pnpm exec oxlint --fix src build.ts preview.ts uno.config.ts vite.config.ts vitest.config.ts`: exit 0.
- `node --import tsx build.ts`: exit 0. HTML, 서버, TypeScript 선언, 설치 묶음 생성 성공.
- 패키지에 `test`·`typecheck` 스크립트 항목은 없어 해당 스크립트 실행은 N/A. 대신 위의 실제 테스트·타입 검사 명령을 실행했다. 승인 없이 스크립트를 추가하지 않았다.

저장소 루트에서 아래 포맷 명령과 동일 인자의 `pnpm exec oxfmt --check`를 실행했다. 작성한 소스·설정·문서·manifest가 대상이며 생성물 `dist`는 제외한다. 최종 포맷 검사 통과.

```sh
pnpm format packages/codex-code-viewer/src packages/codex-code-viewer/{build.ts,preview.ts,uno.config.ts,vite.config.ts,vitest.config.ts,tsconfig.json,package.json,index.html,README.md,review.md,assets/icon.svg,.codex-plugin/plugin.json,.mcp.json} .pnpmfile.cjs pnpm-workspace.yaml
```

브라우저는 실제 AppBridge와 빌드된 stdio MCP 서버로 검증했다. 줄 6–8 선택 시 강조와 `main.tsx:6:1-8:1` 주소가 일치했다. `PuppetEditor` 정의의 127줄로 이동하고 뒤로가기로 복귀했다. 토스트는 5초 수명의 실행 상태를 확인한 뒤 DOM에서 제거됐으며 하단 주소를 유지했다. 수정된 서버에서도 없는 절대 경로의 토스트를 확인했다.

공식 데스크톱 CLI의 `codex plugin add codex-code-viewer@winter-love-code-viewer --json`은 exit 0. 설치 사본과 새 빌드의 SHA-256이 각각 일치했다:

- HTML: `ceb6bf719d0212cbc05922701e0344ba2f4fad14a2009ef8b2f2a7ed39c6bb33`
- 서버: `c3e3f792b7fc02f5eecbf4b08038a0af9d1035513aba36a0811f82d4cd2de9f8`

[현재 미리보기](http://127.0.0.1:57279/b6378914-e363-4e8d-8d8d-a016e030b754/)는 최신 UI와 서버로 계속 실행한다. 기존 `56200` 서버도 종료하지 않았다. 기존 서버는 시작 때 읽은 이전 MCP 백엔드를 사용하므로 새 서버의 오류 처리를 검증한 증거로 쓰지 않았다.

## Verification gaps

1. 이번 수정 후 네이티브 Codex 탭의 실제 파일 진입·구독·종료 흐름은 직접 확인하지 못했다. 설치 사본의 일치와 실제 AppBridge·stdio 검증은 완료했지만 네이티브 화면의 증거를 대신하지 않는다. 실행 중인 네이티브 인스턴스가 이미 새 서버를 사용한다고 주장하지 않는다.
2. 실제 호스트의 초기화 실패·응답 지연을 강제로 발생시키지는 않았다. 해당 실패·경합은 SDK 통신 경계를 대체한 결정적 회귀 테스트로 검증했다. 브라우저 hover와 reduced-motion의 토스트 일시 정지는 이번 검토에서 다시 실행하지 않았다.

## 남은 P3/P4 제안 — 미구현

아래 번호로 선택할 수 있다. [사용한 스킬](/Users/bichi/.codex/worktrees/fd5e/web/.agents/skills/critical-review-fix-loop/SKILL.md:13)의 “group structural P3s into an unimplemented refactor proposal requiring user authorization” 규정에 따라 구조 리팩터링은 미구현 제안으로 남긴다. 요청된 P0–P2 수정과 검증은 완료했다.

1. **P3: 선택 상태 머신과 파일 열기 순서를 렌더링에서 분리.** [SCodeDocument](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/SCodeDocument.tsx:21)의 anchor·drag 상태와 확장 선택·포인터 종료 전이, [SCodeViewer](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/SCodeViewer.tsx:18)의 열기 완료 후 줄 이동이 컴포넌트 안에 있다. [Solid 규칙 3](/Users/bichi/.codex/worktrees/fd5e/web/.agents/skills/solidjs/SKILL.md:14)은 상태 머신과 상태에 따른 후속 작업을 훅에서 구현하도록 요구한다. 현재 상태 전이를 독립적으로 테스트할 수 없어 DOM·포인터 준비와 함께 검증해야 하는 비용이 있다. 범위 선택 연산을 훅으로 분리하고, 파일 열기·줄 이동 순서는 기존 뷰어 훅에서 제공하는 방향을 제안한다. DOM 포커스·캡처·스크롤과 표시 방식은 유지하며, 파일 수가 늘어나는 비용이 있다. 현재 동작 결함으로 판정하지 않았다.
2. **P4: README의 검증 시점 스냅샷 정리.** [README의 20개 테스트 기록](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/README.md:61)과 특정 CLI 버전의 과거 결과는 현재 65개 테스트와 혼동하기 쉽다. 지속적인 사용 계약·한계와 당시 검증 이력을 구분하고, 매번 바뀌는 테스트 개수는 검토 기록으로 옮기는 방향을 제안한다. 실행 동작에는 영향이 없다.

## Out of scope

Codex 앱 자체 개조·기본 `.tsx` 뷰어 교체, 새 기능과 의존성 추가, 다른 앱 전체 테스트, 커밋·push·PR 작업은 수행하지 않았다. 기존 루트 의존성 변경은 검토하고 보존했다.
