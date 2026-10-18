# Code Viewer 개발자 안내

[English development guide](./development.md)

## 빌드와 로컬 설치

저장소 의존성을 설치한 뒤 패키지 디렉터리에서 아래 명령을 실행합니다. 설치와 사용 방법은 [사용 설명서](./README.ko.md)를 참고하세요.

```sh
pnpm build
codex plugin marketplace add "$PWD/dist" --json
codex plugin add codex-code-viewer@winter-love-code-viewer --json
```

`dist/plugin`은 서버, HTML, TypeScript 표준 선언 파일, `.codex-plugin/plugin.json`, `.mcp.json`을 포함한 설치용 묶음입니다. 실행 시 별도 npm 설치가 필요하지 않습니다. `dist/.agents/plugins/marketplace.json`은 이 묶음을 가리키는 로컬 카탈로그입니다.

코드를 바꾼 뒤에는 다시 빌드하고 `codex plugin add codex-code-viewer@winter-love-code-viewer --json`을 실행해 설치 사본을 갱신합니다. 데스크톱이 사용 중인 서버를 다시 읽으려면 앱을 다시 열어야 할 수 있습니다.

## npm 배포

원본 [`package.json`](https://github.com/bichikim/web/blob/dev/packages/codex-code-viewer/package.json)에서 공개 여부, 설치 명령, 배포 파일과 의존성을 관리합니다. 실행에 필요한 라이브러리는 번들에 포함하고 `devDependencies`로 관리합니다. 빌드는 실행 파일과 라이선스 고지를 `dist`에 생성하며 별도 npm manifest를 만들지 않습니다. `dist/plugin`은 로컬 플러그인 설치용 묶음입니다. `dist`는 Git에 포함하지 않습니다.

```sh
pnpm build
pnpm pack --pack-destination ./dist
# tarball 내용과 독립 실행을 검증한 뒤 배포
npm publish "./dist/winter-love-codex-code-viewer-<version>.tgz" --access public
```

새 버전은 `package.json.version`만 수정한 뒤 `pnpm build`를 실행합니다. [버전 동기화 단계](./build/sync-plugin-version.ts)가 플러그인 manifest와 저장소 루트 `.agents/plugins/marketplace.json`의 npm 버전을 갱신하므로, 생성된 변경도 `package.json`과 함께 커밋합니다. 이 패키지도 모노레포 `Release packages` Action에서 버전으로 배포 여부를 판정합니다. 배포 소스와 태그는 저장소 [릴리스 규칙](https://github.com/bichikim/web/blob/dev/RELEASE.md)을 따릅니다. npm 배포가 성공한 뒤 같은 소스 커밋에 `@winter-love/codex-code-viewer@버전` 태그를 만들고 push합니다. 일반 사용자의 설치·업데이트는 npm의 `latest`를 사용하므로 Git 태그를 설치 명령에 넣지 않습니다. GitHub 카탈로그를 사용하는 사람은 해당 태그를 `--ref`로 지정할 수 있습니다.

릴리스의 압축 파일 검증 단계는 배포 전에 실제 Code Viewer tarball로 [설치와 런타임을 검증](../../scripts/npm-release/verify-code-viewer.md)합니다.

## 브라우저 미리보기

```sh
node --import tsx preview.ts /absolute/path/to/file.tsx
# 파일 선택 전 대화 패널의 작업 폴더 트리로 검증
node --import tsx preview.ts /absolute/path/to/workspace --panel
# 작업 폴더를 확인할 수 없는 대화의 안내 화면으로 검증
node --import tsx preview.ts /absolute/path/to/workspace --panel --empty
```

출력 URL을 Codex 브라우저에서 엽니다. 임의 토큰 경로를 가진 loopback 서버가 실제 빌드된 stdio MCP 서버와 AppBridge를 연결합니다. 네이티브 파일 도구 입력과 호스트 경로 메타데이터를 전달하여 동일한 뷰어를 실행합니다. 상단의 **호스트 테마** 선택으로 실제 브리지의 테마 변경 이벤트를 검증할 수 있습니다. 다시 빌드한 뒤 같은 주소를 새로고침하면 최신 UI를 읽습니다. `Ctrl+C`로 종료합니다. 상단의 **채팅 컨텍스트 미리보기**를 펼치면 호스트가 받은 모든 범위를 확인할 수 있습니다. **컨텍스트 비우기**로 호스트의 소비·제거 이벤트를 검증합니다. 네이티브 뷰어 메뉴 등록 여부나 개별 첨부 칩의 표시를 대신 검증하는 것은 아닙니다.

## 검증

```sh
pnpm exec vitest run --config vitest.config.ts
pnpm exec tsc --noEmit -p tsconfig.json
```
