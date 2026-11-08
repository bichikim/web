# Intel Mac GPU 검증

개인 Intel Mac 없이도 원격 환경에서 검사할 수 있다. 실행기의 CPU 이름, Metal 명령 완료, WebKit WebGL과 실제 설치 앱의 캐릭터 렌더를 구분한다.

## 무료 CI에서 확인한 범위

- macOS 15.7.9 Intel의 [대조 검사](https://github.com/bichikim/web/actions/runs/42515948730)와 macOS 26.6.1 Intel의 [대조 검사](https://github.com/bichikim/web/actions/runs/42515954588)에서 Metal 삼각형의 녹색 픽셀 readback이 완료됐다. 장치는 `Apple Paravirtual device`, `mac2`는 `false`였다. 보이는 창의 WebGL1/2는 즉시 생성과 첫 animation frame 뒤 생성 모두 context가 소실됐고 복원 이벤트도 없었다. 이 대조는 Poffo 설치 앱의 통과가 아니다.
- 현재 [공식 WebKit ANGLE 구현](https://github.com/WebKit/WebKit/blob/b443e00ee70abb7bf195cba2df3d2e48f601f199/Source/ThirdParty/ANGLE/src/libANGLE/renderer/metal/DisplayMtl.mm#L141)은 Mac GPU family 2가 없는 Metal 장치의 초기화를 거절한다. 실행기의 관측과 맞지만 해당 OS에 탑재된 WebKit의 내부 로그까지 확보한 원인 확정과는 구분한다.
- macOS 26 Intel의 [설치 앱 검사](https://github.com/bichikim/web/actions/runs/42512990506)는 첫 접근성 snapshot에서 검사기가 시간 초과됐다. 이 실행을 네이티브 캐릭터 GPU 판정으로 사용하지 않는다.

`intel-execution=rosetta`는 ARM CI에서 동일한 Intel DMG를 실행한다. 앱·CLI의 `lipo` 결과와 내장 Node의 `x64`·`sysctl.proc_translated=1`을 확인한다. 번역된 Intel 바이너리의 실제 WebView 동작을 검사하며, Intel CPU나 Intel GPU 검증으로 바꾸어 기록하지 않는다. `require-native-gpu=true`일 때 캐릭터 PNG를 만들지 못하면 검사가 실패한다.

[Rosetta 전체 UI 실행](https://github.com/bichikim/web/actions/runs/42517945948)에서는 원본 Intel 설치물로 122파츠·7모션을 유지한 361×640 캐릭터 PNG를 생성하고 빈 프레임이 아님을 확인했다. PNG SHA-256은 `7e739c9ee2a7c809ce8b1e0bdb01bc8d0290810aec4d3acc30822d13838a4ae9`였다. 이후 저장 창 준비의 제한 시간에 걸려 전체 `complete`는 `false`다. 첫 네 체크포인트의 GPU 결과와 이후 저장 창 실패를 구분한다.

`native-gpu-only=true`는 첫 네 체크포인트의 실제 앱·로드·편집·PNG만 끝낸다. 드라이버와 모든 단언이 통과한 경우에만 `gpuComplete: true`를 기록하며 전체 `complete`는 `false`로 유지한다. 기존 시스템 대화상자 검사를 통과시키는 우회 옵션이 아니다.

[새 Intel 설치물의 GPU 전용 실행](https://github.com/bichikim/web/actions/runs/42520225690)은 네 단계와 드라이버 종료를 모두 통과해 `gpuComplete: true`를 기록했다. 설치물 원본은 `fa44dae6cef46b832c2a9b38c1fc1b211cd5b8f1`, Intel DMG SHA-256은 `af9585440239e31e89bb553c7da986a38c5d55e7725ee04c8d92103b95eab5ec`다. 물리 Intel 환경은 아래 절차로 별도 검사한다.

압축 개선 후 [Rosetta 전체 실행](https://github.com/bichikim/web/actions/runs/42522171408)은 16개 체크포인트가 완료됐지만 마지막 완료 약 3초 전에 검사기 전체 10분 마감이 Xcode를 중단했다. 전체 통과로 기록하지 않았다. Rosetta 전체 수명 검사의 드라이버 예산은 15분으로 분리하고 `driverLimitMs`를 보고서에 기록한다. GPU 전용·일반 실행은 기존 10분이며 요청 30초·저장 창 60초 등 개별 검사는 유지한다.

[예산을 분리한 최종 전체 실행](https://github.com/bichikim/web/actions/runs/42523690145)은 동일한 소스 `705506cb1c58d70006d875d2103c12565dfa310b`의 Intel DMG로 16단계와 Xcode 정상 종료를 모두 통과했다. 실제 캐릭터 PNG, 저장 취소·완료, 새 프로세스 재열기·복구, 독립 호스트 유지까지 확인했고 `complete: true`, `nativeFrame.available: true`, `driverLimitMs: 900000`을 기록했다. 이는 번역 실행의 전체 통과다.

## 원격 물리 Intel Mac에서 실행할 절차

후보는 [AWS EC2 `mac1.metal`](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-mac-instances.html)이다. 공식 사양은 2018 Intel Mac mini의 bare metal 호스트다. [Apple Metal 표](https://developer.apple.com/metal/capabilities/)는 Intel UHD Graphics 630의 Mac2 지원을 명시한다. 실제 할당된 환경에서 GPU 노출과 WebKit 렌더가 작동하는지는 먼저 아래 사전 검사로 확인해야 한다.

2026-11-09 확인한 [공식 요금 JSON](https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-ondemand.json)의 발행 시각은 `2026-11-07T00:28:52Z`다. N. Virginia의 mac1 호스트는 시간당 USD 1.083이다. [최소 할당·과금 24시간](https://aws.amazon.com/ec2/instance-types/mac/faqs/)으로 호스트만 최소 USD 25.992이며 EBS·주소·트래픽·세금은 별도다. 인스턴스를 중지해도 호스트를 해제하기 전까지 호스트 과금이 계속된다. 비용 승인을 받지 않아 호스트를 생성하지 않았다.

1. 승인 후 mac1 용량·할당량과 최신 macOS 15 AMI를 확인하고 전용 호스트 한 대만 할당한다. SSH와 [Apple Remote Desktop](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-mac-instance.html)으로 로그인한 GUI 세션을 준비한다. Xcode와 명령줄 도구, UI 테스트 접근성 권한을 확인한다.
2. 검증할 커밋과 그 커밋의 Intel DMG·`installer.json`을 가져온다. SHA-256을 대조하고 checkout 밖에 설치한다. 저장된 Poffo 작업과 분리된 비어 있는 workspace·output을 지정한다. [공통 실행기](../README.md)의 네 환경 변수와 `POFFO_NATIVE_REQUIRE_GPU=true`를 사용한다.
3. `node apps/poffo/native/macos/verify-hardware.mjs`로 Intel CPU, 번역 실행 아님, 가상 GPU 아님, Metal 픽셀, Mac2와 WebGL stencil context를 검사한다. 실패하면 환경 미충족으로 기록하고 앱 통과를 주장하지 않는다.
4. 사전 검사가 통과하면 `node apps/poffo/native/run.mjs`를 실행한다. 실제 설치 앱의 캐릭터 PNG와 창·대화상자·저장·재열기·복구 결과를 `hardware.json`, `graphics-control.json`, `report.json`, PNG, XCTest 결과와 함께 보관한다. `complete: true`와 `nativeFrame.available: true`가 모두 필요하다.
5. 완료 후 해당 전용 검증 인스턴스를 종료하고, 최소 할당 시간이 지난 뒤 전용 호스트를 해제한다. 전용 EBS·주소 등 생성한 자원을 확인해 정리하고 실제 청구 시간을 기록한다. 기존 자원은 건드리지 않는다.

이 절차는 실행 준비이며 아직 물리 Intel GPU에서 실행한 증거가 아니다. Rosetta나 SwiftShader 결과로 사전 검사를 우회하지 않는다.
