# 실캐릭터 제작 검증

2026-11-08, macOS arm64 로컬 설치물과 GitHub의 Windows x64·Intel Mac·ARM Mac 실행기에서 저장소의 `packages/puppet/examples/development-model.json`을 별도 작업 폴더로 복사해 검사했다. 원본은 122파츠·20,297정점·72파라미터·82바인딩·6모션이다. 새 디자인을 생성한 검사가 아니라 기존 캐릭터에 새 모션을 제작하는 검증이다.

[제작 레시피](recipe.json)는 기존 메시·텍스처·계층·키폼·물리를 보존하면서 얼굴·몸통 회전, 깜빡임, 입, 꼬리를 묶은 모션을 추가한다. patch 한 단계와 실제 GPU PNG 여섯 단계로 구성한다.

## 검증 계약

- macOS는 DMG의 앱을 복사하고 Windows는 NSIS로 설치한다. 저장소 밖의 공백 경로와 시스템 Node를 제외한 PATH, 잘못된 NODE_OPTIONS에서도 동봉 Node를 실행한다. macOS의 한글 파일 저장은 별도 네이티브 검증에 기록한다.
- 사용자 bin 폴더에 명령을 등록하고 그 경로로 다시 실행한다. 기존 다른 명령은 보존한다.
- 표준 stdio MCP 클라이언트가 같은 호스트의 sessionId와 캐릭터 상태를 읽는다.
- 중립·좌우·깜빡임·미소·얼굴/몸통 복합 포즈를 1280px PNG로 캡처한다. 여섯 이미지가 유효하고 서로 다른지 검사한다.
- 정지 캡처에서는 페이지 시계를 멈추고 명시적으로 redraw한다. 연속 재생 검증에서는 시계를 다시 재생한다. 이 조건과 실제 관측 프레임 수를 report에 기록한다.
- 실제 Viewer에서 새 모션을 두 번 연속 재생하고 시간 갱신을 관측한다. 정지 PNG는 물리를 끄므로 연속 물리 재생 검증의 근거로 사용하지 않는다.
- 출력 `.poffo`를 새 Node 프로세스에서 읽는다. 원본 파일 해시, 기존 모션, 모션을 제외한 전체 리그 해시가 보존되는지 확인한다.
- Chromium은 실제 SwiftShader renderer를 확인한다. Chromium과 WebKit 모두 Editor·Viewer·새 호스트 재열기의 RGBA 픽셀을 정확히 비교한다. 전체 OS 실행은 여섯 포즈의 PNG RGBA 해시도 허용 오차 없이 비교한다.

실행 명령은 [설치 앱 설명](../../src-tauri/README.md)에 있다. 출력 폴더에는 모델·recipe·여섯 포즈·저장 전후 PNG·재생 화면·report를 보관한다. Playwright의 실제 재생 녹화도 별도 보관할 수 있다. report에는 입력·리그·이미지·레시피 산출물 해시와 관측한 프레임 시간이 들어가며 인증 토큰은 넣지 않는다.

## 실행 결과

MSAA 읽기와 PNG 알파 변환을 수정한 소스 `abcd466af4576a46cee0d5f9da5702f193835aac`에서 설치물을 새로 빌드했다. [최종 CI](https://github.com/bichikim/web/actions/runs/42488520236)는 세 OS의 설치·Node·명령 등록·MCP·제작·재열기를 통과했으며, 여섯 포즈의 PNG RGBA도 세 OS에서 모두 정확히 일치했다. 개인 기기 대신 GitHub의 해당 OS·아키텍처에서 직접 설치·실행했다.

로컬 macOS arm64의 새 DMG에서도 Chromium/SwiftShader와 WebKit의 실제 제작 E2E가 통과했다. 원본·리그 보존, 7단계 레시피, MCP 연결, 모션 두 사이클, 새 호스트 재열기를 확인했다. 두 브라우저 모두 같은 OS·브라우저 안에서 Editor·Viewer·재열기의 RGBA가 일치했다. 같은 Chromium에서 로컬과 CI의 여섯 포즈 해시도 모두 같다.

| 환경               | 설치물 | 설치·Node·등록 명령·MCP·제작·재열기·RGBA                                          |
| ------------------ | ------ | --------------------------------------------------------------------------------- |
| Windows 2025 x64   | NSIS   | [통과](https://github.com/bichikim/web/actions/runs/42488520236/job/128755640028) |
| macOS 15 Intel x64 | DMG    | [통과](https://github.com/bichikim/web/actions/runs/42488520236/job/128755639906) |
| macOS 15 ARM64     | DMG    | [통과](https://github.com/bichikim/web/actions/runs/42488520236/job/128755639564) |

픽셀 수정의 단위 테스트 13개, Node·CLI 회귀 45개, Chromium·WebKit의 MSAA 정답 대조도 통과했다. Poffo 타입 검사와 린트 오류 0개를 확인하고 저장소 포맷을 적용했다.

로컬 산출물은 Git에서 제외한 `output/`에 있다. `manifest.json`은 로컬 DMG와 엔진 해시·검사 결과·미확인 범위를, 브라우저별 `report.json`은 세부 증거를 담는다. 로컬 두 report의 엔진 해시는 해당 DMG 안의 CLI와 GUI 엔트리로 계산한 해시와 일치한다. 플랫폼별 보고서와 빌드·커밋·설치물 SHA-256은 `output/platforms/`에, 최종 CI의 세 설치 파일은 `output/installers/pixel-parity/`에 보관한다. 텍스처 업로드만 수정했던 이전 보고서는 `output/history/texture-upload-fix/`에 남긴다.

## 관측과 한계

여섯 포즈를 직접 검토했으며 해당 범위에서 큰 파츠 누락이나 찢어짐은 보이지 않았다. 이 관측은 새 그림·파츠 교체·새 메시/리깅 제작의 품질, 모든 파라미터 조합, 모든 GPU를 보증하지 않는다.

이전 WebKit/Apple GPU 경로에서는 저장 없이 Viewer로 전환해도 RGB가 달라졌다. PNG 인코딩 전 GPU 픽셀에서도 차이가 났으며, 같은 이미지의 2D 디코딩 값이 같아도 WebGL에 업로드된 텍스처 바이트가 달라지는 경계를 확인했다. dithering 해제와 샘플러 정밀도 변경은 해결하지 못했다. [텍스처 로딩](../../../../packages/puppet/src/player/rendering/load-texture.ts#L6)은 sRGB RGBA를 읽고 알파를 명시적으로 곱한 바이트를 Pixi에 전달한다. 결과 PNG의 픽셀을 보정하는 방식은 아니다. 이 환경의 전체 제작 검증에서 RGB 차이가 없어졌으며 다른 GPU 전체를 보증하지 않는다.

같은 캐릭터의 player 생성·렌더·파기를 브라우저마다 다섯 번 반복했다. 각 브라우저에서 생성한 텍스처 665개와 버퍼 1,195개가 모두 해제됐다. Chromium의 GC 후 버퍼 저장 메모리는 다섯 회 모두 22,665,050바이트였다. 이는 반복 횟수에 따른 자원 보유 검사이며 장시간 실행이나 전체 프로세스 메모리 상한 검증은 아니다. 세부 기록은 `output/diagnostics/texture-resources/report.json`에 있다.

Windows의 등록 명령은 Rust가 반환한 verbatim 경로를 `cmd.exe`에서 읽지 못해 실패했다. 같은 설치물에서 접두사만 제거하면 실행되는 대조 실험으로 확인했고, 명령 생성 시 drive·UNC 경로를 셸 형식으로 변환했다. 별도의 저장 대조에서는 GPU 없이 21MB 체크포인트를 약 4초에 저장했다. 대조 로그는 `output/diagnostics/texture-validation/`에 보관한다.

OS 간 차이는 두 읽기 경계에서 발생했다. MSAA canvas를 암묵적으로 읽을 때 생기던 반올림 차이는 같은 크기의 RGBA8 버퍼로 명시적으로 resolve해 없앴다. 같은 RGBA의 PNG 알파 변환에서도 ARM과 x64가 달라 공통 인코더를 적용했다. 샘플 수·해상도·renderer는 유지했다. [원인과 재현 절차](../../browser/pixels/README.md)에 수정 전 실패와 중간 출력 증거를 기록한다.

완전 일치가 확인된 OS 간 범위는 Chromium/SwiftShader의 여섯 포즈 PNG다. WebKit은 로컬 Mac에서 Editor·Viewer·재열기 간 일치를 확인했다. 다른 물리 GPU·브라우저 전체의 일치를 보증하지 않는다. 이전 차이 수치와 수정 전후 진단은 `output/diagnostics/`에 보존한다.

텍스처 수정 전 macOS arm64 네이티브 앱에서 실제 캐릭터 표시·GUI 편집의 Node 반영·PNG 캡처를 확인했다. 시스템 저장 창에서 취소하면 파일이 생기지 않고 미저장 상태가 유지됐다. 실제 저장한 `.poffo`를 새 내장 Node 프로세스에서 열어 GUI 문서 전체와 일치하고 122파츠·7모션이 보존됨을 확인했다. 한글 이름 파일을 저장하고 새 프로세스로 전체 문서 일치를 확인했다. 저장 뒤 창을 닫으면 추가 확인 없이 앱과 소유 호스트가 종료돼 저장 상태 반영도 확인했다. 독립 CLI 호스트는 연결된 창을 닫은 뒤에도 같은 sessionId·revision으로 유지됐다. 이 결과와 저장 파일은 `output/native/`에 보관하며 최신 렌더러의 브라우저 검증과 구분한다.

이전 네이티브 검증에서 미저장 종료 확인 창은 편집 창에 연결했다. 실제 창 닫기에서 취소하면 같은 호스트·revision·문서를 유지했고, 앱 메뉴에서 종료를 확인하면 창과 앱이 소유한 호스트가 종료됐다. 같은 workspace를 다시 열어 미저장 문서 전체가 복구됨을 확인했다.

2026-11-09, [Windows 네이티브 CI](https://github.com/bichikim/web/actions/runs/42502198812/job/128797173587)에서 같은 NSIS 설치물의 실제 창·시스템 파일 창·종료 확인을 UI Automation으로 조작했다. 16단계 모두 통과했다. 파일 열기·저장 취소와 종료 취소는 같은 sessionId·revision·전체 문서를 유지했다. 한글 파일 저장 뒤 추가 확인 없이 창과 소유 호스트가 종료됐으며, 새 프로세스에서 122파츠·7모션과 문서 전체가 일치했다. 미저장 종료 후 복구 문서도 전체 일치했고 저장 파일은 보존됐다. 독립 CLI 호스트는 연결 창을 닫아도 같은 상태로 유지됐다. 실제 WebView2의 640px PNG도 비어 있지 않았다. 보고서·PNG·접근성 트리는 `output/native-platforms/windows/`에 있다.

같은 소스의 로컬 macOS arm64 설치물에서도 시스템 파일 창으로 122파츠·6모션을 열고 네이티브 WebView PNG를 생성했다. 미저장 종료 확인 뒤 복구 파일 보존과 소유 호스트 종료를 확인했다. 이 대조 기록은 `output/diagnostics/native-arm64-current/`에 있다.

## 네이티브 저장 오류 수정 후 검증

Intel Mac에서는 파일은 저장됐지만 저장 상태 갱신이 실패해 종료 확인이 다시 나타났다. [별도 CLI 호스트를 둔 실제 창 진단](https://github.com/bichikim/web/actions/runs/42504917995)에서 이벤트 스트림이 마지막 데이터로부터 약 61초 뒤 닫히고, 이후 저장 갱신 요청이 서버에 도달하지 않는 것을 확인했다. 당시 연결 어댑터가 같은 취소 신호로 모든 요청을 중단하고 있었다.

[연결 어댑터](../../src/backend/browser/connect-model-host.ts#L164)는 응답 읽기가 중단되면 새 클라이언트와 snapshot으로 다시 연결한다. 같은 sequence를 재적용하지 않아 저장 대화상자에 넘긴 문서의 동일성을 유지한다. 유휴 단절·누락된 편집 동기화·재연결 실패·잘못된 이벤트·동일 문서 보존 회귀를 검사했다.

[수정 후 실제 창 진단](https://github.com/bichikim/web/actions/runs/42508396821)에서는 약 61초의 유휴 단절이 반복된 뒤에도 네이티브 저장 상태 갱신이 HTTP 200과 `ok: true`로 완료됐다. 저장 후 렌더 요청도 GUI까지 전달됐고 GPU 미지원 오류가 돌아왔다. 연결이 사라졌다는 오류와 구분한다. 이 6단계 진단은 16단계 전체 검증과 별도이며 보고서의 `complete`는 `false`로 유지한다.

수정 소스 `216f1e0962d59bf82410fb4f3ea26b87239ff82c`에서 세 설치물을 새로 빌드했다. 각 설치 앱의 네이티브 검사 16단계가 모두 통과했다. 시스템 열기·저장·종료의 취소는 같은 세션과 문서를 유지했고, 한글 파일 저장 뒤 추가 확인 없이 소유 호스트가 종료됐다. 새 프로세스 재열기와 미저장 종료 후 복구는 문서 전체가 일치했다. 독립 CLI 호스트도 연결 창을 닫은 뒤 같은 상태로 유지됐다. 세 OS에서 저장한 파일의 SHA-256은 모두 `047817a857a5986fa9d66c17cf96a70a38ff403bfd5b2f722522a2e14642e4fd`다.

| 환경               | 네이티브 창·대화상자·수명                                                                | 네이티브 캐릭터 PNG   |
| ------------------ | ---------------------------------------------------------------------------------------- | --------------------- |
| Windows 2025 x64   | [16단계 통과](https://github.com/bichikim/web/actions/runs/42508193612/job/128815409117) | 생성                  |
| macOS 15 Intel x64 | [16단계 통과](https://github.com/bichikim/web/actions/runs/42506507905/job/128810194234) | context 소실로 미검증 |
| macOS 15 ARM64     | [16단계 통과](https://github.com/bichikim/web/actions/runs/42506507905/job/128810194472) | 생성                  |

Windows는 16개 동작 검사를 마친 뒤 검사기 종료가 실패한 실행도 있었다. 검사기를 MTA로 시작하고 모달 호출을 마친 뒤 이벤트를 해제하도록 정리했다. 같은 설치물의 재검사에서 다섯 앱 종료 코드 `0`과 검사기 정리 완료까지 확인했다. 실패 실행을 통과 기록으로 사용하지 않는다.

같은 새 설치물의 추가 Chromium 제작 회귀에서는 [첫 실행](https://github.com/bichikim/web/actions/runs/42508404719)에 Windows의 최종 호스트 종료와 Intel의 첫 레시피 단계가 시간 초과로 실패했다. 앱 코드는 바꾸지 않고 요청 단계·종료 상태 진단을 보강한 [재검사](https://github.com/bichikim/web/actions/runs/42510100229)에서 세 OS의 제작·MCP·재열기·부모 EOF 종료가 통과했다. Chromium/SwiftShader의 여섯 포즈 RGBA도 세 OS에서 정확히 일치했다. 이 재검사 시점에는 원인을 확정하지 못해 제품 수정으로 해결했다고 기록하지 않았다. 이후 재현과 수정은 아래에 정리한다.

연결 변경을 포함한 백엔드 단위 회귀 8파일·32테스트, Node·CLI 회귀 45테스트와 실제 Chromium의 동기화·개발 모드 검사 2테스트도 통과했다. Poffo 프로덕션 빌드·타입 검사·린트 오류 0개를 확인했다. 최신 설치물의 플랫폼별 보고서·설치물 해시와 픽셀 비교는 `output/platforms/runs/42510100229/`에 보관한다.

보고서·창 PNG·접근성 트리·Mac XCTest 결과는 `output/native-platforms/runs/`의 실행 번호와 OS별 폴더에 보관한다. 원인 추적 자료는 `output/diagnostics/native-intel-save-ack/`에 있다. Intel 실행기는 별도의 실제 창에 표시한 WebKit에서도 WebGL1/2 stencil 속성이 `null`이고 context가 소실됐다. 창 표시 상태와 전체 화면 PNG도 확인했다. 기본 context 객체가 생성된 사실만으로 렌더 통과로 기록하지 않는다. 실행기 밖의 다른 물리 GPU 전체를 보증하지 않는다. [검사 실행법과 한계](../../native/README.md)를 참고한다.

## 반복 시간 초과 원인 추적

기존 Windows 설치물을 중계 없이 반복한 [진단 실행](https://github.com/bichikim/web/actions/runs/42518014727)에서 다섯 번째 제작 검증의 재열기 호스트가 부모 EOF 뒤 종료되지 않았다. 실패 후 Node 공식 디버거로 확인한 활성 자원은 stdout·stderr pipe와 TCP 연결 하나였다. 서버 리스너와 stdin은 이미 닫혔고 이벤트 루프 유휴 시간은 37.201초였다. 연결 파일도 남았다. 어느 HTTP 요청이 그 연결을 남겼는지까지 기록한 것은 아니지만, 계산 작업이 아니라 종료되지 않은 연결이 프로세스를 유지하는 상태를 재현했다.

미완성 HTTP 본문으로 같은 종료 대기를 별도 재현했고 읽지 않은 큰 snapshot·응답 없는 렌더도 경계 검사에 포함했다. 로컬의 큰 snapshot 대조는 기존 설치물도 바로 종료돼 원래 원인의 증거로 사용하지 않았다. [호스트 종료](../../src/backend/node/start-node-host.ts#L76)는 접수한 명령·복구 저장을 끝내고 남은 HTTP 연결을 정리한다. 대기 중인 렌더는 취소하며, 접수한 편집이 새 변경을 만들면 일반 종료의 저장 상태를 다시 확인한다. 저장 중 쓰기를 끊어 종료 시간만 줄이지 않는다.

기존 Intel 설치물의 [요청별 반복 진단](https://github.com/bichikim/web/actions/runs/42514050557)에서는 `edit.preview`와 `edit.apply`가 HTTP 200으로 끝난 뒤 첫 체크포인트 `document.save`가 30.013초에 중단됐다. 성공한 반복에서도 같은 저장은 약 22~28초가 걸렸다. 로컬의 실제 122파츠 문서 CPU 대조에서 기존 Node 경로의 WASM 함수가 전체 프로파일 시간의 82.1%를 차지했다. 복구 저장과 명시적 저장이 함께 실행되는 동안의 첫 저장은 8.27초였다.

[Node 압축 어댑터](../../src/backend/node/serialize-document-file.ts#L18)는 공통 컨테이너에 비동기 네이티브 Brotli를 연결한다. 같은 로컬 내장 Node 대조에서 첫 저장은 3.41초였고 이벤트 루프가 압축 중 대기할 수 있었다. 이 수치는 로컬 후보 CLI 측정이며 설치 앱의 CI 통과와 구분한다. 바이트·문서 보존과 독립 취소를 검사했다.

수정 소스 `fa44dae6cef46b832c2a9b38c1fc1b211cd5b8f1`의 [Windows 반복 검사](https://github.com/bichikim/web/actions/runs/42519178200)는 제작 6회와 픽셀 대조 6회를 통과했고, 12개 호스트가 부모 EOF 후 모두 종료 코드 0으로 끝났다. [같은 설치물의 네이티브 검사](https://github.com/bichikim/web/actions/runs/42519183749)도 16단계를 통과했다. 실제 설치 CLI의 미완성 HTTP 요청 대조는 Windows에서 약 16ms, ARM Mac에서 약 6ms에 종료됐다. 요청·종료 제한 시간은 늘리지 않았다.

[Intel 반복 검사](https://github.com/bichikim/web/actions/runs/42520219576)도 제작 6회·대조 6회를 통과했고 12개 호스트가 정상 종료했다. 체크포인트·결과 파일 저장 54회는 4.767~10.952초, 중앙값 5.386초였다. 48번의 렌더 요청도 최장 14.924초에 완료됐다. 이 계측은 요청 중계를 사용했으며, Windows 종료 대조는 중계 없이 실행했다.

추가 네이티브 검사에서 저장 창 준비도 제한 시간에 걸려 브라우저 압축을 따로 비교했다. 같은 실제 문서의 로컬 WASM 대조에서 level 9는 4.74초·21,510,043바이트, level 6은 1.63초·21,888,280바이트였다. 원본을 보존하는 level 6으로 브라우저 저장 비용을 줄였다. 이는 파일 크기와 처리 시간의 조정이며 이미지 품질을 낮추지 않는다. 검사기도 저장 창이 나타나지 않으면 중단해 실패 이후 단계를 통과로 남기지 않는다.

CPU 대조·원래 실패의 요청·프로세스 자료와 수정 후 반복 보고서는 `output/diagnostics/runtime-timeouts/`에 있다. 공통 컨테이너 92테스트와 Node·CLI 52테스트, 타입 검사와 린트 오류 0개를 확인했다. 설치물별 후속 결과는 실행 번호와 설치물 원본 커밋을 함께 대조한다.

## Intel 바이너리 GPU의 추가 범위

macOS 15·26 Intel VM의 Metal 삼각형은 실제 녹색 픽셀을 반환했지만 같은 창의 WebKit WebGL1/2는 소실됐다. 장치는 `Apple Paravirtual device`이고 Mac2 지원은 없었다. GPU 전체가 없다는 판정과 구분한다. 대조 JSON은 `output/diagnostics/native-gpu-control15/`와 `native-gpu-control26/`에 있다.

같은 Intel 설치물을 ARM에서 번역한 [Rosetta GPU 전용 검사](https://github.com/bichikim/web/actions/runs/42520225690)는 실제 앱 열기·문서 열기·모션 추가·네이티브 PNG의 네 체크포인트를 통과했다. 앱·CLI는 단일 x86_64 바이너리, 내장 Node는 x64 번역 실행임을 확인했다. 122파츠·7모션과 기존 리그를 보존했고 361×640 PNG가 비어 있지 않았다. 보고서는 `gpuComplete: true`, 전체 UI의 `complete: false`다.

이는 Intel 바이너리의 실제 WebView GPU 검사이며 물리 Intel CPU·GPU 검증은 아니다. [원격 물리 Intel Mac 실행 절차](../../native/macos/README.md)에 사전 검사·비용·정리 절차를 준비했다. 새 비용 승인을 받지 않아 물리 호스트는 생성하지 않았다. Rosetta 보고서와 PNG는 `output/diagnostics/native-gpu-rosetta/runs/42520225690/`에 있다.

## 최종 설치물 검증

압축 개선을 포함한 소스 `705506cb1c58d70006d875d2103c12565dfa310b`의 [최종 세 OS 실행](https://github.com/bichikim/web/actions/runs/42520522419)은 내장 Node·등록 CLI·MCP·7단계 레시피·연속 재생·저장/재열기·부모 EOF 종료를 모두 통과했다. Chromium/SwiftShader 여섯 포즈의 RGBA도 정확히 일치했다. 플랫폼별 설치물·보고서·픽셀 비교는 `output/platforms/runs/42520522419/`에 있다.

| 실행 환경                   | 전체 네이티브 16단계                                             | 실제 앱 캐릭터 GPU         |
| --------------------------- | ---------------------------------------------------------------- | -------------------------- |
| Windows 2025 x64            | [통과](https://github.com/bichikim/web/actions/runs/42521546398) | PNG 생성                   |
| macOS 15 ARM64              | [통과](https://github.com/bichikim/web/actions/runs/42521538471) | PNG 생성                   |
| macOS 15 Intel VM           | [통과](https://github.com/bichikim/web/actions/runs/42522165358) | 독립 WebKit도 context 소실 |
| ARM의 Intel 앱 Rosetta 실행 | [통과](https://github.com/bichikim/web/actions/runs/42523690145) | GPU 필수 조건으로 PNG 생성 |

모두 동일한 최종 빌드 실행의 설치물을 사용했다. 한글 파일 저장·종료 취소·새 프로세스 재열기·미저장 복구·독립 호스트 유지와 문서 전체 일치를 확인했다. 압축 파일 해시는 플랫폼별로 기록하고 문서·렌더 픽셀 일치와 구분한다. Rosetta 전체 실행은 측정된 번역 실행 시간을 반영한 검사기 예산 15분으로 정상 종료까지 통과했으며, 요청 30초·저장 창 60초 제한은 유지했다. 실제 Intel Mac GPU까지 검사한 결과는 아니다.

초기 `fa44dae6c` 빌드 후 Intel의 첫 54MB JSON 문서 호스트 시작이 30초를 넘은 실행도 있었다. 레시피 전의 별도 시작 실패이며 원인은 확정하지 못했다. 동일 설치물의 독립 반복 12개 호스트와 최종 소스의 빌드·제작 실행에서는 재현되지 않았다. 이 관측을 원래 체크포인트 저장 오류의 원인이나 수정 근거로 섞지 않는다.
