# 설치 앱 네이티브 검증

개인 Windows·Intel Mac 없이 GitHub의 해당 OS 실행기에서 설치 앱과 시스템 대화상자를 조작한다. Windows는 .NET UI Automation, macOS는 Xcode XCTest/XCUIAutomation을 사용한다. 브라우저 드라이버나 앱 내부 테스트 훅으로 대화상자를 대신하지 않는다.

[데스크톱 워크플로](../../../.github/workflows/poffo-desktop-build.yml)를 `native-ui=true`로 실행한다. `target`은 검사할 OS, `reuse-run`은 이미 빌드한 설치물의 실행 번호다. 설치물의 원본 커밋·SHA-256과 실행기의 OS·아키텍처를 함께 기록하므로 테스트 코드만 고칠 때 앱을 다시 빌드할 필요가 없다.

```sh
gh workflow run poffo-desktop-build.yml --ref YOUR_BRANCH \
  -f target=x86_64-apple-darwin -f reuse-run=INSTALLER_RUN -f native-ui=true
```

검사 흐름과 단언은 [공통 컨트롤러](run.mjs), 실제 조작은 [Windows 드라이버](windows/Driver.cs)와 [Mac 테스트](macos/Tests.swift)에 있다. 파일 열기·저장 취소, 한글 파일명 저장, 미저장 종료 취소·확인, 새 프로세스 재열기·복구, 독립 CLI 호스트 유지까지 순서대로 검사한다. 편집은 공개 백엔드 명령을 사용하고 파일 선택·저장·종료는 네이티브 UI로 수행한다.

`poffo-validation-*` artifact의 `native/report.json`은 각 단계가 실제로 끝난 뒤 갱신된다. 전체 단계와 원본 파일 보존 검사를 마친 경우에만 `complete: true`다. 창·대화상자 PNG, 접근성 트리, 네이티브 WebView 렌더 PNG도 보관하며 Mac에는 XCTest 결과 번들이 추가된다. 실패 실행의 일부 스크린샷을 전체 통과로 해석하지 않는다.

로컬 실행에는 설치된 앱·내장 CLI와 비어 있는 전용 작업 폴더가 필요하다. `POFFO_NATIVE_APP`, `POFFO_INSTALLED_CLI`, `POFFO_NATIVE_WORKSPACE`, `POFFO_NATIVE_OUTPUT`을 지정하고 `node apps/poffo/native/run.mjs`를 실행한다. 출력 폴더의 상위에는 워크플로가 생성한 `installer.json`이 있어야 한다. 테스트는 자체 workspace만 정리한다. Mac UI 조작 중에는 클립보드와 포커스를 사용하므로 일상 작업과 동시에 실행하지 않는다.

OS 실행기의 네이티브 창·WebView·시스템 패널 검증과 물리 기기의 GPU·디스플레이 검증은 범위가 다르다. 이 검사만으로 모든 하드웨어의 픽셀 일치나 앱 서명·공증을 확인한 것으로 간주하지 않는다. 확정된 통과 기록은 [캐릭터 검증 기록](../validation/character/README.md)에 남긴다.
