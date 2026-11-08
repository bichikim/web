# 설치 앱 런타임

Tauri는 네이티브 창과 파일 대화상자를 제공하고, 앱 내부의 Node가 공유 모델·CLI·MCP 호스트를 실행한다. 웹 단독 실행은 브라우저 모델 바인딩을 계속 사용한다.

## 빌드

기존 `build:desktop`, `build:desktop:mac`, `build:desktop:windows`, `dev:desktop` 명령은 Tauri hook으로 [런타임 준비](../bin/prepare-desktop.mjs)를 호출한다. GUI와 CLI를 빌드하고, 현재 빌드 Node 버전의 공식 배포 파일을 SHA-256 검증 후 동봉하며, Rust CLI launcher를 대상 아키텍처로 빌드한다. `TAURI_ENV_TARGET_TRIPLE`을 사용하므로 Intel Mac 교차 빌드에도 같은 이름의 arm64 Node를 넣지 않는다. CLI 의존성과 스킬은 오프라인 실행용으로 함께 들어가고 Node·의존성 고지는 `runtime/licenses`에 보관한다.

지원 대상은 macOS arm64/x64, Windows x64다. 생성된 `binaries`, `runtime`, Cargo `target`은 소스 관리 대상이 아니다. Node 배포 파일을 받는 빌드 단계에만 네트워크가 필요하다. 서명·공증은 별도 배포 설정이며 로컬 빌드가 이를 증명하지 않는다.

## 설치 구조와 수명

macOS는 `Contents/MacOS/{Poffo,poffo-node,poffo-cli}`와 `Contents/Resources/runtime`을, Windows는 설치 폴더의 `{Poffo.exe,poffo-node.exe,poffo-cli.exe,runtime}`을 사용한다. launcher는 자신의 실제 위치에서 Node와 리소스를 찾는다. cwd·저장소·시스템 Node에 의존하지 않으며 외부 `NODE_OPTIONS`, `NODE_PATH`는 전달하지 않는다. CLI 파일만 앱 밖으로 복사하지 않고 사용자 명령을 등록한다.

GUI가 소유한 호스트는 stdin EOF와 정상 종료 요청으로 정리한다. 종료 확인에서 취소하면 계속 편집할 수 있고, 종료를 선택하면 마지막 완료 문서를 복구 저장한 뒤 닫는다. 다른 CLI가 만든 호스트에 연결한 창은 해당 호스트를 종료하지 않는다. 기본 작업 폴더는 OS의 Poffo 앱 데이터 폴더이며 `--workspace DIR [--file FILE]`로 지정할 수 있다.

터미널 명령 등록은 [CLI 설명](../src/cli/README.md)을 따른다. 사용자 메뉴 동작으로만 등록하며 기존 다른 명령을 덮어쓰지 않는다.

## 설치물 검증

빌드 후 앱을 저장소 밖의 공백 경로에 복사한다. `poffo-cli doctor`로 번들 Node 경로를 확인하고 `POFFO_INSTALLED_CLI`를 해당 절대 경로로 지정해 아래 검사를 실행한다.

```sh
POFFO_INSTALLED_CLI="/absolute/Poffo.app/Contents/MacOS/poffo-cli" \
POFFO_VALIDATION_OUTPUT="/absolute/validation" \
pnpm exec playwright test --config apps/poffo/playwright.character.config.ts
```

검사는 실제 캐릭터 레시피·렌더·모션 재생·MCP·독립 프로세스 재로드를 수행한다. 네이티브 저장 대화상자·미저장 종료 확인·창과 호스트의 수명은 별도 실제 앱 검증 대상이다. 데스크톱 빌드 워크플로는 macOS DMG를 읽기 전용으로 열어 앱을 복사하고, Windows NSIS는 공식 `/S /D=` 인자로 격리 경로에 설치한 후 Chromium 검증을 수행한다. 다른 OS의 실행과 GitHub runner 결과는 로컬 macOS 결과로 대신하지 않는다.

NSIS 무인 설치 인자는 [공식 명령행 문서](https://nsis.sourceforge.io/Docs/Chapter3.html#3.2.1)를 따른다.

패키징은 [Tauri sidecar](https://v2.tauri.app/develop/sidecar/)와 [리소스 번들](https://v2.tauri.app/develop/resources/) 계약을 따른다.
