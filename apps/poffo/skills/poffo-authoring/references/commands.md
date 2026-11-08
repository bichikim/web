# 명령 연결과 실행

Poffo 실행 파일의 `--help`와 `operations`가 현재 명령 계약이다. 저장소에서는 `node apps/poffo/bin/poffo.mjs`로 같은 실행 파일을 호출한다. 설치 앱에서는 등록된 `poffo` 또는 앱 내부 CLI의 절대 경로를 사용하고 `doctor`로 번들 런타임을 확인한다. 시스템 Node나 저장소 의존성이 필요하다고 가정하지 않는다.

- `start`는 빌드된 GUI와 Node 세션을 함께 시작한다. `dev`는 소스 환경에서 개발 GUI를 같은 호스트에 연결한다. `--cli`는 브라우저 자동 열기를 생략한다. 모든 호출에 같은 `--workspace`를 지정한다.
- `status`로 세션과 revision·진행 중인 트랜잭션을 읽고 `operations`로 입력 스키마를 조회한다. `inspect`는 텍스처 바이트 없이 구조를 읽는다. 정확한 패치 대상은 `call document.read`에서 확인한다.
- `open`은 workspace 안의 PSD·JSON·Poffo 입력을 읽는다. `preview`로 RFC 6902 패치를 검증하고, 반환된 revision·fingerprint를 `apply`에 전달한다. `call`은 발견한 연산과 JSON 입력을 직접 전달한다. 경로·식별자·배열 위치를 추측하지 않는다.
- `shell`은 줄마다 JSON 명령을 받아 같은 세션에서 실행한다. 종료해도 호스트는 유지된다. `mcp`는 stdio의 `poffo_operations`와 `poffo_call`을 제공한다. MCP stdout에는 프로토콜 외 텍스트를 쓰지 않는다.
- 변경 완료 응답과 파일 저장 완료를 구분한다. `save`는 완료된 모델을 저장하며 기존 파일 교체에는 명시적인 overwrite가 필요하다. 원본을 출력 대상으로 재사용하지 않는다.
- `stale-revision`이면 다시 조회·preview한다. `busy`이면 해당 편집의 완료를 기다린다. 연결 단절 후에는 세션을 다시 확인한다. 호출자가 같은 요청을 재전송할 때는 같은 requestId와 같은 입력을 유지하며, 호스트의 제한된 재전송 기록을 영구 작업 기록으로 간주하지 않는다.
- `view.render`는 연결된 GUI가 필요하다. 캡처할 revision·출력 경로와 포즈 파라미터 또는 motionId·time을 지정한다. 물리 시뮬레이션은 정지 프레임 캡처에 포함되지 않으므로 실제 재생으로 별도 확인한다.
- `recipe`는 버전 있는 입력·순서 있는 patch/render 단계·출력으로 구성된 JSON을 실행한다. `recipe-schema`로 현재 입력 스키마를 확인한다. `--resume`은 같은 입력·레시피·엔진과 해시가 일치하는 기록만 복원한다. 실패 기록을 확인하고 원인을 수정한 뒤 재개한다.

연결 파일의 토큰과 GUI 실행 URL의 인증 fragment는 로그·레시피·인계 자료에 넣지 않는다. 원격 서비스나 별도 실행 환경의 권한으로 확대 해석하지 않는다.
