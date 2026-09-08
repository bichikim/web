# Pomo E2E

최초 한 번 Chromium을 설치한 뒤 웹과 Apps in Toss 로컬 모드를 함께 실행합니다.

```sh
pnpm --filter @apps/pomo test:e2e:install
pnpm --filter @apps/pomo test:e2e
```

Apps in Toss 프로젝트만 실행하려면 `test:e2e:apps-in-toss`를 사용합니다. 이 모드는 SDK 로컬 브라우저 DevTools의 mock 환경을 검증하며, Sandbox 또는 실제 기기의 네이티브 브리지 검증을 대체하지 않습니다.

전체 E2E 실행에는 별도 fixture에서 실제 SolidStart SSR과 Apps in Toss SSG를 빌드한 뒤, 빌드된
정적 클라이언트가 SSR의 `/_server`를 호출하는 회귀 테스트도 포함됩니다.

Client action E2E fixture는 production action과 API adapter를 직접 import하고 브라우저에서
명령 workflow, submission 상태, native form fallback, 실제 HTTP 계약을 검증합니다.

일반 웹의 설정 테마 회귀 테스트는 실제 홈 화면에서 설정을 열고 테마를 선택합니다.
설정 재진입·새로고침 후 복원, 키보드 선택, 시스템 테마 변경 반영과 고정 테마 유지를 검증합니다.

```sh
pnpm --filter @apps/pomo test:e2e --config=playwright.settings.config.ts --workers=1
```

전용 설정은 로컬 서버의 필수 환경값에 명시적인 테스트용 문자열과 루프백 주소를 사용합니다.
실제 인증정보는 필요하지 않습니다. 이 테스트는 API 응답이나 테마 저장소를 mock하지 않습니다. 시스템 색상 설정만 Playwright로
에뮬레이션하며, Chromium과 로컬 개발 서버의 일반 웹 동작을 검증합니다. Apps in Toss
프로젝트에서는 제외하므로 실제 네이티브 Storage나 기기 동작의 근거로 사용하지 않습니다.

`settings.spec.ts`는 성공 시에도 `test-results`에 영상을 보존합니다. PR의
`Pomo settings E2E` 워크플로는 PR head commit을 실행하고 영상·보고서·실행 명령·commit SHA를
Actions artifact에 30일간 보존합니다. Artifact 링크는 다운로드용이며 PR 내 재생 영상이 아닙니다.
