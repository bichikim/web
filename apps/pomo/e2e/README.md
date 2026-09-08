# Pomo E2E

최초 한 번 Chromium을 설치한 뒤 웹과 Apps in Toss 로컬 모드를 함께 실행합니다.

```sh
pnpm --filter @apps/pomo test:e2e:install
pnpm --filter @apps/pomo test:e2e
```

Apps in Toss 프로젝트만 실행하려면 `test:e2e:apps-in-toss`를 사용합니다. 이 모드는 SDK 로컬 브라우저 DevTools의 mock 환경을 검증하며, Sandbox 또는 실제 기기의 네이티브 브리지 검증을 대체하지 않습니다.

테스트는 실행 대상에 따라 `shared/`, `web/`, `apps-in-toss/`에 둡니다. `shared/`는 두
프로젝트에서 실행하며, 플랫폼 전용 테스트는 해당 폴더에서만 수집합니다. 새 테스트를 추가할 때
파일별 제외 목록을 수정할 필요가 없습니다. 선택 규칙은 [Playwright 설정](../playwright.config.ts)에 있습니다.
재사용하는 테스트 조작은 `helpers/`, 별도 서버 앱은 `fixtures/`에 둡니다.

전체 E2E 실행에는 별도 fixture에서 실제 SolidStart SSR과 Apps in Toss SSG를 빌드한 뒤, 빌드된
정적 클라이언트가 SSR의 `/_server`를 호출하는 회귀 테스트도 포함됩니다.

Client action E2E fixture는 production action과 API adapter를 직접 import하고 브라우저에서
명령 workflow, submission 상태, native form fallback, 실제 HTTP 계약을 검증합니다.

설정 테마 회귀 테스트는 일반 웹과 Apps in Toss 로컬 모드의 홈 화면에서 설정을 열고 테마를 선택합니다.
설정 재진입·새로고침 후 복원, 키보드 선택, 시스템 테마 변경 반영과 고정 테마 유지를 검증합니다.

```sh
pnpm --filter @apps/pomo test:e2e --config=playwright.settings.config.ts --workers=1
```

전용 설정은 로컬 서버의 필수 환경값에 명시적인 테스트용 문자열과 루프백 주소를 사용합니다.
실제 인증정보는 필요하지 않습니다. 이 테스트는 API 응답이나 테마 저장소를 mock하지 않습니다. 시스템 색상 설정만 Playwright로
에뮬레이션합니다. Apps in Toss 검증은 SDK 로컬 브라우저 DevTools의 mock 환경이며 실제 기기나
네이티브 Storage 검증을 대체하지 않습니다.
