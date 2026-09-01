# Pomo E2E

최초 한 번 Chromium을 설치한 뒤 웹과 Apps in Toss 로컬 모드를 함께 실행합니다.

```sh
pnpm --filter @apps/pomo test:e2e:install
pnpm --filter @apps/pomo test:e2e
```

Apps in Toss 프로젝트만 실행하려면 `test:e2e:apps-in-toss`를 사용합니다. 이 모드는 SDK 로컬 브라우저 DevTools의 mock 환경을 검증하며, Sandbox 또는 실제 기기의 네이티브 브리지 검증을 대체하지 않습니다.

전체 E2E 실행에는 별도 fixture에서 실제 SolidStart SSR과 Apps in Toss SSG를 빌드한 뒤, 빌드된
정적 클라이언트가 SSR의 `/_server`를 호출하는 회귀 테스트도 포함됩니다.
