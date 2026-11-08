# Poffo CLI

설치 앱에는 Node와 CLI, 의존성, 제작 스킬이 함께 들어 있다. 별도 Node 설치 없이 앱의 **도움말 → 터미널 명령 설치…**에서 사용자 명령을 등록한다. macOS 기본 경로는 `~/.local/bin/poffo`, Windows는 `%LOCALAPPDATA%/Poffo/bin/poffo.cmd`다. 표시된 폴더를 터미널 PATH에 추가하면 `poffo doctor`, `poffo start --workspace /absolute/project`로 실행한다. 기존의 다른 명령은 덮어쓰지 않고 shell 설정도 자동 변경하지 않는다. 앱을 이동했다면 기존 등록 경로를 확인해 지운 뒤 새 위치에서 다시 등록한다.

소스 개발 환경에서는 Node 24 이상과 저장소 의존성을 사용한다. 저장소 루트에서 다음과 같이 실행한다.

```sh
pnpm exec turbo run build --filter=@winter-love/poffo...
node apps/poffo/bin/poffo.mjs start --workspace /absolute/project --file model.psd
```

앱의 macOS CLI 원본은 `Poffo.app/Contents/MacOS/poffo-cli`, Windows는 설치 폴더의 `poffo-cli.exe`다. `install-cli --directory DIR`로 다른 폴더에 등록할 수 있다. `doctor`는 실제 Node 경로·버전·번들 manifest를 출력하며 인증 토큰은 포함하지 않는다. 번들 구조와 빌드는 [설치 앱 설명](../../src-tauri/README.md)에 있다.

## 실행 모드

- `start`: 빌드된 호스트와 GUI를 시작한다. 설치물은 네이티브 앱을, 소스 CLI는 브라우저를 연다.
- `dev`: 소스 저장소에서 CLI를 다시 빌드하고 개발 GUI를 같은 호스트에 연결한다. 설치물에는 개발 서버가 포함되지 않는다.
- `--cli`: 브라우저 자동 열기를 생략한다. 읽기·편집·PSD 가져오기·저장은 GUI 없이 실행한다. PNG 렌더에는 연결된 GUI가 필요하다.
- 같은 workspace에서 다시 시작하면 기존 세션에 연결한다. `--gui`로 GUI를 다시 열 수 있다. 이미 실행 중인 세션을 다른 파일이나 개발 모드로 교체하지 않는다.

네이티브 앱이 처음 만든 호스트는 앱 수명을 따른다. 미저장 종료에는 확인 창이 나타나며 취소할 수 있다. CLI가 먼저 만든 세션에 앱이 연결했다면 앱을 닫아도 CLI 호스트는 유지한다. 네이티브 문서 저장은 시스템 저장 대화상자의 경로에 쓰고, 저장 당시 revision·문서 해시가 일치할 때 호스트의 저장 상태를 갱신한다.

첫 CLI 호스트 프로세스는 터미널에서 계속 실행된다. 다른 터미널의 CLI·shell·MCP가 그 호스트에 연결한다. `--workspace` 기본값은 현재 디렉터리다. 입력·출력 경로는 workspace 안에서 해석하며 출력의 부모 디렉터리는 이미 있어야 한다.

## 명령 계약

`--help`는 편의 명령을, `operations`는 실행 중인 명령과 JSON Schema를 출력한다. 카탈로그의 원본은 [명령 서비스](../backend/create-command-service.ts#L26)다. `status`와 `inspect`, `call`로 조회하고 `open`·`save`·`undo`·`redo`로 같은 모델을 제어한다. 보통 결과는 stdout의 JSON 하나이며 실패 종료 코드는 1이다. `--json`을 별도로 지정할 필요가 없다.

패치 파일은 RFC 6902 연산의 배열이다. `preview PATCH.json`의 revision·fingerprint를 확인한 뒤 `apply PATCH.json --revision N --fingerprint HASH`로 정확한 후보를 적용한다. 여러 패치가 모두 검증되어야 한 undo 단계로 반영된다. 원본 파일을 변경하지 않으며 파일 교체는 `--overwrite`로 명시한다.

오래된 revision, 다른 클라이언트의 편집 중 트랜잭션, 유효하지 않은 후보는 거절한다. 요청마다 같은 의미의 고유 requestId를 사용한다. 동일 요청 재전송은 프로세스 내 최근 기록에서 재사용하지만 영구적인 exactly-once 처리는 제공하지 않는다.

`call view.render --input JSON`은 특정 revision과 파라미터 또는 motionId·time의 PNG를 저장한다. size는 큰 쪽 길이이며 종횡비를 유지한다. 물리 시뮬레이션을 끄고 별도 플레이어의 실제 렌더 완료 뒤 캡처한다. 결과에 모델 해시·렌더 revision·실제 크기를 반환한다.

`shell`은 줄마다 `{operation,input,requestId}` JSON을 받고 결과를 줄마다 반환한다. requestId를 생략하면 생성한다. `exit` 또는 입력 종료는 shell만 종료한다. 호스트 종료는 `stop`이며 미저장 편집이 있으면 거절한다. `stop --discard`와 프로세스 종료 신호는 복구 저장을 마친 뒤 종료한다. 마지막 완료 문서의 복구 파일은 유지한다.

## 제작 레시피

`recipe-schema`는 현재 레시피 JSON Schema를 출력한다. 레시피에는 version 1, 입력 경로, 순서 있는 patch/render 단계, 출력 경로·형식·overwrite를 지정한다. patch에는 위의 JSON Patch 배열을 사용하고 render에는 렌더 연산의 포즈·경로·크기를 지정한다. 임의 JS나 shell은 실행하지 않는다.

`recipe FILE.json`으로 실행하고 `recipe FILE.json --resume`으로 재개한다. 입력·레시피·엔진과 체크포인트·완료 렌더·최종 출력의 SHA-256을 확인한다. 단계별 모델 체크포인트와 report는 workspace의 `.poffo/recipes` 아래에 저장한다. 같은 입력·레시피의 기록이 이미 있으면 새로 덮지 않고 resume을 요구한다. 엔진 변경이나 파일 변조가 있으면 재개를 거절한다.

레시피 도중 다른 클라이언트가 모델을 변경하면 stale-revision으로 중단한다. 재개는 기록된 모델을 복원하므로 현재 작업을 보존할 필요가 있으면 먼저 별도 파일로 저장한다. 각 단계는 한 번의 편집 또는 캡처이며 전체 레시피의 파일 출력까지 rollback하지는 않는다. 실패 직후 report를 확인한다. 파일 생성 후 기록 전에 중단되었다면 해당 미완료 출력은 명시적인 overwrite 설정이나 별도 정리가 필요하다.

## MCP와 스킬

설치 앱의 MCP 설정은 `command`에 등록된 `poffo` 또는 원본 CLI의 절대 경로를, `args`에 `["mcp", "--workspace", 프로젝트절대경로]`를 지정한다. 소스 환경은 `node`, Poffo bin의 절대 경로, 같은 인자를 사용한다. 이미 실행 중인 호스트가 필요하다. [stdio 어댑터](run-mcp.ts#L10)는 `poffo_operations`와 `poffo_call`을 제공하며 별도 모델을 만들지 않는다. MCP stdout에는 프로토콜 메시지만 출력한다.

`skill`은 번들에 포함된 [Poffo 제작 스킬](../../skills/poffo-authoring/SKILL.md)의 경로를 출력한다. 사용 중인 에이전트 호스트에 이 디렉터리를 등록하면 된다. Poffo가 전역 에이전트 설정을 자동 수정하지 않는다.

연결 파일 `.poffo/connection.json`은 프로세스별 인증 토큰을 담는 비공개 로컬 파일이다. 토큰이나 실행 URL의 인증 fragment를 공유 로그·레시피에 포함하지 않는다. HTTP는 loopback·Bearer·Host·Origin 검사를 사용한다. 원격 호스팅을 위한 서버가 아니다.
