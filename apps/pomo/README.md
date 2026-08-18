# Pomo

장면, 포모도로, 음악, 대화와 피드를 한 화면에서 제공하는 SolidStart 집중 앱이다.

## 명령

```sh
pnpm --filter @apps/pomo dev
pnpm --filter @apps/pomo build:web
pnpm --filter @apps/pomo build:apps-in-toss-ssg
pnpm --filter @apps/pomo preview:apps-in-toss-ssg
pnpm --filter @apps/pomo build:apps-in-toss-package
pnpm --filter @apps/pomo typecheck
```

- `build:web`: 브라우저용 SolidStart SSR 빌드
- `build:apps-in-toss-ssg`: 앱인토스 패키징 전 단계인 SSG 빌드 (`.output/public`)
- `preview:apps-in-toss-ssg`: SSG 빌드 결과를 로컬 서버에서 확인
- `build:apps-in-toss-package`: 앱인토스 SSG 빌드 후 업로드용 `pomo-app.ait` 생성

`.ait` 패키징은 AIT CLI 요구사항에 따라 Node.js 24 이상에서 실행한다. 웹과 SSG 빌드는 저장소 공통 Node.js 요구사항을 따른다.

콘솔에 등록한 값이 기본값과 다르면 빌드 전에 환경 변수를 지정한다.

```sh
POMO_APPS_IN_TOSS_APP_NAME=<appName> \
pnpm --filter @apps/pomo build:apps-in-toss-package
```

기술 및 제품 결정은 [`plan/development.md`](./plan/development.md)에서 확인한다.
외부 코드·모델·데이터·에셋의 라이선스와 배포 조건은
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)에서 관리한다.
