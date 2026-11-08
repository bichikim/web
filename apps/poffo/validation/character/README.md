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
- Chromium은 실제 SwiftShader renderer를 확인한다. Chromium과 WebKit 모두 Editor·Viewer·새 호스트 재열기의 RGBA 픽셀을 정확히 비교한다. 허용 오차를 높이거나 출력 픽셀을 반올림해 통과시키지 않는다.

실행 명령은 [설치 앱 설명](../../src-tauri/README.md)에 있다. 출력 폴더에는 모델·recipe·여섯 포즈·저장 전후 PNG·재생 화면·report를 보관한다. Playwright의 실제 재생 녹화도 별도 보관할 수 있다. report에는 입력·리그·이미지·레시피 산출물 해시와 관측한 프레임 시간이 들어가며 인증 토큰은 넣지 않는다.

## 실행 결과

텍스처 업로드 수정 후 macOS arm64 DMG의 실제 CLI로 Chromium/SwiftShader와 WebKit의 제작 E2E가 각각 통과했다. 원본·리그 보존, 7단계 레시피, MCP 연결, 모션 두 사이클, 새 호스트 재열기를 확인했다. 두 브라우저 모두 같은 OS·브라우저 안에서 Editor·Viewer·재열기의 RGBA가 일치했다. 같은 macOS Chromium에서 수정 전후 여섯 포즈의 픽셀 해시도 모두 같았다.

[최종 CI](https://github.com/bichikim/web/actions/runs/42474387324)는 세 OS 모두 같은 제작 계약을 Chromium/SwiftShader에서 통과했다. 개인 기기 대신 GitHub가 제공하는 해당 OS·아키텍처에서 직접 설치·실행했으며, 로컬 교차 빌드 결과로 실행을 대신하지 않았다.

| 환경               | 설치물 | 설치·Node·등록 명령·MCP·제작·재열기·RGBA                                          |
| ------------------ | ------ | --------------------------------------------------------------------------------- |
| Windows 2025 x64   | NSIS   | [통과](https://github.com/bichikim/web/actions/runs/42474387324/job/128712326822) |
| macOS 15 Intel x64 | DMG    | [통과](https://github.com/bichikim/web/actions/runs/42474387324/job/128712326591) |
| macOS 15 ARM64     | DMG    | [통과](https://github.com/bichikim/web/actions/runs/42474387324/job/128712326760) |

로컬 산출물은 Git에서 제외한 `output/`에 있다. `output/manifest.json`은 로컬 DMG와 엔진 해시·검사 결과·미확인 범위를, 브라우저별 `report.json`은 세부 증거를 담는다. 로컬 두 report의 엔진 해시는 해당 DMG 안의 CLI와 GUI 엔트리로 계산한 해시와 일치한다. CI는 재빌드 없이 원본 설치물을 다시 설치했으며, 플랫폼별 보고서와 원본 빌드·커밋·설치물 SHA-256을 `output/platforms/`에 보관한다. Windows·Intel Mac 설치 파일은 `output/installers/`에도 있다.

## 관측과 한계

여섯 포즈를 직접 검토했으며 해당 범위에서 큰 파츠 누락이나 찢어짐은 보이지 않았다. 이 관측은 새 그림·파츠 교체·새 메시/리깅 제작의 품질, 모든 파라미터 조합, 모든 GPU를 보증하지 않는다.

이전 WebKit/Apple GPU 경로에서는 저장 없이 Viewer로 전환해도 RGB가 달라졌다. PNG 인코딩 전 GPU 픽셀에서도 차이가 났으며, 같은 이미지의 2D 디코딩 값이 같아도 WebGL에 업로드된 텍스처 바이트가 달라지는 경계를 확인했다. dithering 해제와 샘플러 정밀도 변경은 해결하지 못했다. [텍스처 로딩](../../../../packages/puppet/src/player/rendering/load-texture.ts)은 sRGB RGBA를 읽고 알파를 명시적으로 곱한 바이트를 Pixi에 전달한다. 결과 PNG의 픽셀을 보정하는 방식은 아니다. 이 환경의 전체 제작 검증에서 RGB 차이가 없어졌으며 다른 GPU 전체를 보증하지 않는다.

같은 캐릭터의 player 생성·렌더·파기를 브라우저마다 다섯 번 반복했다. 각 브라우저에서 생성한 텍스처 665개와 버퍼 1,195개가 모두 해제됐다. Chromium의 GC 후 버퍼 저장 메모리는 다섯 회 모두 22,665,050바이트였다. 이는 반복 횟수에 따른 자원 보유 검사이며 장시간 실행이나 전체 프로세스 메모리 상한 검증은 아니다. 세부 기록은 `output/diagnostics/texture-resources/report.json`에 있다.

Windows의 등록 명령은 Rust가 반환한 verbatim 경로를 `cmd.exe`에서 읽지 못해 실패했다. 같은 설치물에서 접두사만 제거하면 실행되는 대조 실험으로 확인했고, 명령 생성 시 drive·UNC 경로를 셸 형식으로 변환했다. 별도의 저장 대조에서는 GPU 없이 21MB 체크포인트를 약 4초에 저장했다. 대조 로그는 `output/diagnostics/texture-validation/`에 보관한다.

픽셀 완전 일치의 범위는 같은 OS·브라우저 안의 상태 전환이다. Windows와 macOS의 SwiftShader 결과 사이에는 작은 차이가 남는다. 여섯 포즈에서 알파의 최대 차이는 1, 회색 배경 합성 후 최대 채널 차이는 1.92 미만이었다. OS 간 완전 일치로 보고하지 않으며 수치는 `output/diagnostics/cross-platform-pixels.json`에 기록한다.

텍스처 수정 전 macOS arm64 네이티브 앱에서 실제 캐릭터 표시·GUI 편집의 Node 반영·PNG 캡처를 확인했다. 시스템 저장 창에서 취소하면 파일이 생기지 않고 미저장 상태가 유지됐다. 실제 저장한 `.poffo`를 새 내장 Node 프로세스에서 열어 GUI 문서 전체와 일치하고 122파츠·7모션이 보존됨을 확인했다. 한글 이름 파일을 저장하고 새 프로세스로 전체 문서 일치를 확인했다. 저장 뒤 창을 닫으면 추가 확인 없이 앱과 소유 호스트가 종료돼 저장 상태 반영도 확인했다. 독립 CLI 호스트는 연결된 창을 닫은 뒤에도 같은 sessionId·revision으로 유지됐다. 이 결과와 저장 파일은 `output/native/`에 보관하며 최신 렌더러의 브라우저 검증과 구분한다.

이전 네이티브 검증에서 미저장 종료 확인 창은 편집 창에 연결했다. 실제 창 닫기에서 취소하면 같은 호스트·revision·문서를 유지했고, 앱 메뉴에서 종료를 확인하면 창과 앱이 소유한 호스트가 종료됐다. 같은 workspace를 다시 열어 미저장 문서 전체가 복구됨을 확인했다. Windows·Intel Mac의 네이티브 WebView·시스템 대화상자 조작과 물리 기기의 GPU 검증은 별도로 남는다.
