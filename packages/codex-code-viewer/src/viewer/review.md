# 파일 내 검색·우클릭 메뉴 검토

2026-10-06 · `critical-review-fix-loop`

## 범위와 최종 상태

직전 작업에서 추가한 파일 내 검색·검색 강조·우클릭 메뉴·클립보드·키보드 처리, 선택 상태와 정의 이동의 관련 호출 경로, 미리보기 초기화와 UnoCSS 설정을 검토했다. 동작, 구조 리팩터링, 명명·파일 배치의 세 관점을 검토했다. 패키지 전체가 아직 untracked여서 Git diff 대신 직전 작업의 변경 파일과 관련 호출 경로를 기준으로 했다. 기존 전체 패키지 검토 이력은 루트 `review.md`에 보존한다.

전체 검토 2회를 완료했다. 1차에서 P2 세 건을 실제 브라우저와 실패하는 회귀 테스트로 확인해 수정했고, 2차에서 동작·리팩터링·명명과 구조를 다시 검토했다. P0/P1은 발견하지 않았고, 남은 P0/P1/P2는 없다. 구조 개선 P3와 정리 P4는 아래 미구현 제안으로 남긴다. PR은 갱신하지 않았다.

### P2-1. 검색 버튼의 Enter를 검색 입력으로 처리

`SFindBar`가 section 전체에서 Enter를 가로채 기본 버튼 활성화를 막는다. 닫기 버튼에 포커스를 두고 Enter를 누르면 검색창이 남고 카운터가 `1/21`에서 `2/21`로 바뀌었다. 이전 결과 버튼도 다음 결과로 이동한다. 수정한 [키 처리](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/SFindBar.tsx:26)는 Enter 검색을 입력창에만 적용해 버튼의 기본 활성화를 보존한다. 수정 후 실제 Enter로 이전 결과가 `1/21 → 21/21`로 이동했고 닫기 버튼은 검색창을 닫았다. [회귀 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/SFindBar.spec.tsx:9)도 통과했다. Escape와 조합 입력 처리는 유지한다.

### P2-2. 우클릭 선택이 확장 선택의 기준 줄을 갱신하지 않음

우클릭 메뉴가 화면의 줄 선택을 직접 갱신해 `useCodeInteraction`의 anchor를 거치지 않는다. 1줄 클릭 → 8줄 우클릭 → Escape → Shift+↑에서 예상 `7–8` 대신 `1–7`을 선택했다. 수정한 [선택 명령](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-code-interaction.ts:29)이 범위 변경 시 기준 줄을 갱신하고, 같은 범위를 우클릭하면 기존 방향을 유지한다. 메뉴도 [같은 명령](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/SCodeDocument.tsx:36)을 사용한다. 수정 후 실제 선택은 `7–8`이 됐다. 역방향 `8 → 3` 선택 중 5줄 우클릭 후 Shift+↑도 `4–8`로 기준 8줄을 유지했다. [기준 줄 회귀 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/SCodeDocument.spec.tsx:47)와 역방향 보존 테스트가 통과했다.

### P2-3. 검색 강조 갱신이 정의 이동의 스크롤을 덮어씀

`SCodeDocument`는 검색 결과 배열이 바뀔 때마다 첫 검색 결과로 스크롤한다. `document`를 검색한 상태에서 `PuppetEditor` 정의로 이동하면 주소·선택은 `PuppetEditor.tsx:127:14`지만 화면은 첫 검색 결과인 8줄이며 선택한 127줄은 보이지 않았다. 수정한 [검색 훅](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-document-search.ts:13)은 입력·결과 이동·검색 열기에만 스크롤 요청을 갱신하고, [문서 렌더링](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/SCodeDocument.tsx:39)은 그 요청만 추적한다. 수정 후 정의 127줄이 실제 화면에 보였으며 `scrollTop=2702`였다. 첫 검색 결과 강조는 8줄에 남고 Enter로 다음 결과에 이동했다. [문서 회귀 테스트](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/__tests__/SCodeDocument.spec.tsx:104)와 검색 명령 테스트가 통과했다. 파일 변경은 검색어·강조를 유지하면서 정의 이동을 우선한다.

## 실행 검증과 설치본

패키지에 test/typecheck script가 없어 해당 script 실행은 N/A다. 검증 자체를 생략하지 않고 아래 명령으로 실행했다. Wallaby MCP가 제공되지 않아 Wallaby CLI를 사용했다. 단위 테스트의 새 시나리오는 개별 실행 시간 150ms 미만이다.

- 기준: `wallaby run --rerun` → 85/85 통과.
- 재현 테스트 추가 후: 같은 명령 → 89개 중 3개 실패. Enter 기본 활성화, 선택 anchor, 마지막 스크롤 대상의 실패를 확인했다.
- 최종: 패키지에서 `wallaby run --rerun` → 90/90 통과, 실패·skip 0, 430.18ms. [최종 테스트 결과](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/node_modules/.wallaby/e8002b8fa1878af2/reports/md/2026-10-06T14-04-36-766Z/all-tests.md).
- 패키지에서 `pnpm exec tsc --noEmit -p tsconfig.json` → exit 0.
- 루트에서 `pnpm exec oxlint --fix packages/codex-code-viewer/src packages/codex-code-viewer/build.ts packages/codex-code-viewer/preview.ts packages/codex-code-viewer/uno.config.ts packages/codex-code-viewer/vite.config.ts packages/codex-code-viewer/vitest.config.ts` → exit 0. 테스트의 긴 줄 오류는 포맷과 테스트명 축약으로 수정했다.
- 루트에서 `pnpm format packages/codex-code-viewer/src packages/codex-code-viewer/{build.ts,preview.ts,uno.config.ts,vite.config.ts,vitest.config.ts,tsconfig.json,package.json,index.html,README.md,review.md,assets/icon.svg,.codex-plugin/plugin.json,.mcp.json} .pnpmfile.cjs pnpm-workspace.yaml` → exit 0. 같은 파일 범위 `pnpm exec oxfmt --check` 통과.
- 패키지에서 `node --import tsx build.ts` → exit 0.

2차 검토는 위 수정뿐 아니라 호출자의 검색어·결과 상태, Unicode UTF-16 오프셋, 원래 token의 정의 이동, 선택 범위 복사, 메뉴 Escape·Tab·방향키·Shift+F10·light dismiss·문서 변경 해제, listener 정리, 요청 경합, UnoCSS top-layer 배치, 의존성 및 root config의 src 역방향 import 여부를 다시 확인했다. 새 P0/P1/P2는 발견하지 않았다.

실제 빌드된 stdio 서버와 AppBridge 미리보기에서 세 재현 절차, 역방향 anchor, 선택 코드 복사, 키보드 메뉴에서 검색 열기, 결과 없음·비활성 탐색 버튼을 확인했다. 브라우저 오류 로그는 0건이었다. [검증 화면](/tmp/codex-code-viewer-reviewed.png)은 검색창을 연 상태에서도 정의 127줄이 보이는 결과다.

공식 데스크톱 CLI로 기존 `codex-code-viewer@winter-love-code-viewer` 설치를 갱신했다. `codex plugin list --marketplace winter-love-code-viewer --json`에서 installed/enabled 모두 true였다. 캐시의 전체 런타임 파일은 빌드 결과와 바이트 단위로 같았다. 배포 ZIP도 116 entries, 2,754,654 bytes로 갱신하고 CRC와 전체 plugin 파일의 일치를 확인했다. HTML SHA-256은 `e4133a5c6b027862c2b634aa30719a1adbbb18988d16e771baee2ff5feb9b5ee`다. 미리보기 서버와 탭은 계속 열어 둔다.

## Verification gaps

1. 네이티브 Codex 패널의 키보드 이벤트 전달·클립보드 권한은 직접 검증하지 못했다. 실제 AppBridge·stdio 미리보기에서 Ctrl/Cmd+F, 버튼 Enter, Shift+F10, 메뉴 키보드 탐색, 복사 텍스트는 확인했다. 이 결과가 네이티브 패널 권한·이벤트 전달까지 증명하지는 않는다.
2. 512KiB 상한 파일에서 다량 검색 결과의 입력 지연은 아직 측정하지 않았다. 성능 결함으로 판정하지 않는다.

## P3/P4 제안 — 미구현

1. **P3: DOM·브라우저 기능과 상태 명령의 경계를 정리.** [useCodeClipboard](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-code-clipboard.ts:7)가 전역 navigator를 직접 사용해 테스트가 전역을 대체하며, [메뉴 상태](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/use-code-context-menu.ts:7)는 소비자가 사용하지 않는 `returnFocus` DOM 노드까지 반환한다. 클립보드의 쓰기 기능을 명시적으로 전달하고 복귀 포커스는 훅 내부에 보관하는 방향을 제안한다. 실제 호출자·테스트를 확인한 구조 개선이며 현재 동작 결함으로 판정하지 않았다. `critical-review`의 교체 가능한 I/O 경계와 Solid의 소비자에게 필요한 값만 노출하는 규칙을 적용한다.
2. **P3: 파일 열기 후 줄 이동을 뷰어 명령으로 모으기.** [SCodeViewer.handleOpen](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/src/viewer/SCodeViewer.tsx:40)이 절대·상대 경로와 파일 열기 후 위치 이동을 조합한다. Solid의 상태에 따른 후속 작업은 훅이 소유한다는 규칙에 따라 기존 뷰어 훅의 명령으로 모으면 렌더링 없이 순서·경합을 검증할 수 있다. 이전 검토의 미구현 제안 중 선택 상태는 이미 훅으로 분리됐고 이 부분이 남았다.
3. **P4: README의 검증 이력과 현재 사용 계약 구분.** [README](/Users/bichi/.codex/worktrees/fd5e/web/packages/codex-code-viewer/README.md:63)에 과거 20개 테스트·CLI 버전의 검증 스냅샷이 남아 현재 결과와 혼동하기 쉽다. 바뀌는 테스트 개수·버전별 검증은 검토 기록으로 옮기는 정리를 제안한다.

## Out of scope

Codex 앱 개조·기본 뷰어 교체, 새 기능·의존성, 다른 앱 구현, 커밋·push·PR 작업은 수행하지 않는다. 기존 루트 의존성 변경은 보존한다.
