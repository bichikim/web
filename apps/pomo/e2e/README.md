# Pomo E2E

최초 한 번 Chromium을 설치한 뒤 웹과 Apps in Toss 로컬 모드를 함께 실행합니다.

```sh
pnpm --filter @apps/pomo test:e2e:install
pnpm --filter @apps/pomo test:e2e
```

Apps in Toss 프로젝트만 실행하려면 `test:e2e:apps-in-toss`를 사용합니다. 이 모드는 SDK 로컬 브라우저 DevTools의 mock 환경을 검증하며, Sandbox 또는 실제 기기의 네이티브 브리지 검증을 대체하지 않습니다.
