# 설치 CLI 종료·실행 시간 검증

[종료 검사](shutdown.mjs)는 실제 설치 CLI를 전용 임시 workspace에서 시작한다. HTTP 서버가 요청 헤더를 받았다는 `100 Continue`를 확인한 뒤 본문을 미완성 상태로 유지하고 부모 stdin을 닫는다. 클라이언트가 연결을 유지해도 프로세스가 정상 종료되고 연결 descriptor가 제거되어야 한다. GUI는 열지 않는다.

```sh
POFFO_INSTALLED_CLI=/path/to/installed/poffo-cli \
POFFO_VALIDATION_OUTPUT=/path/to/evidence \
node apps/poffo/validation/runtime/shutdown.mjs
```

`--expect-stall`은 이전 설치물의 대조용이다. 종료가 멈췄다가 클라이언트를 해제하면 끝나는지 검사하고, 보고서의 `complete`는 `false`로 유지한다. 새 설치물의 통과 기록으로 사용하지 않는다.

[데스크톱 워크플로](../../../../.github/workflows/poffo-desktop-build.yml)의 `runtime-diagnostics=true`는 설치 앱의 실캐릭터 제작 검증을 반복한다. 실패 시 해당 호스트에만 Node 공식 디버거를 붙여 활성 자원과 libuv handle을 기록하고 분리한다. `runtime-observer=false`는 중계 없이 직접 연결한 대조이며, 기본 관찰 모드는 요청의 연산명·크기·시간만 저장한다. 인증 헤더와 문서 본문은 보관하지 않는다. 검사기는 앱의 요청·렌더·종료 제한 시간을 늘리지 않는다.

`shutdown.json`은 종료 대조, `runtime/<sessionId>/requests.json`은 HTTP 시점, `chromium/cycle-*/operation-failure.json`과 `shutdown-failure.json`은 실패 후의 자원을 담는다. 반복 실행의 각 `report.json`과 설치물의 `installer.json`을 함께 확인한다. 과거에 계측하지 않은 실패의 원인은 새 회귀 실험만으로 확정하지 않는다.
