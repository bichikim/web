# Winter Love Web

SolidStart 앱과 공용 TypeScript 패키지를 함께 관리하는 pnpm·Turborepo 모노레포다.

```sh
pnpm install
```

설치가 끝나면 루트 `postinstall`이 `turbo prepare-build`를 실행해 워크스페이스 빌드 준비 작업을 수행한다.

대표 개발 서버는 필터를 지정해 실행한다.

```sh
pnpm --filter @apps/pomo dev
```

```sh
pnpm --filter @apps/coong dev
```

```sh
pnpm --filter @apps/pomo-audio-gateway dev
```

앱별 환경 설정과 추가 명령은 해당 디렉터리의 README 또는 `package.json`에서 확인한다.

## 공통 명령

```sh
pnpm typecheck       # 전체 워크스페이스 타입 검사
pnpm lint            # Oxlint 검사
pnpm format          # Oxfmt 적용
pnpm format:check    # 포맷 검사
pnpm test:vitest     # unit 프로젝트 테스트
pnpm test            # unit·빌드 통합·Storybook 테스트
pnpm storybook:dev   # 공용 Storybook 개발 서버
pnpm generate        # Turborepo generator 실행
```

Pull request에서는 GitHub Actions가 타입 검사, Oxlint, 포맷 검사와 테스트를 실행한다.

## 릴리스

`dev`는 통합·검증 브랜치이고 `main`은 유일한 운영 릴리스 소스다. `main`에 병합해도 자동 배포되지 않으며, GitHub `Actions`에서 `main`을 선택해 다음 workflow를 필요한 시점에 각각 실행한다.

- `Release packages`: public npm 패키지 배포
- `Release Pomo`: Pomo 운영 배포
- `Release Coong`: Coong 운영 배포

세 대상은 서로 독립적이므로 같은 `main` commit을 배포할 필요가 없다. 버전 규칙, prerelease, 필수 secret·variable과 실패 복구 절차는 [릴리스 설명서](./RELEASE.md)에서 확인한다.

## Wallaby.js

[![Wallaby.js](https://img.shields.io/badge/wallaby.js-powered-blue.svg?style=for-the-badge&logo=github)](https://wallabyjs.com/oss/)

저장소 기여자는 [Wallaby.js OSS License](https://wallabyjs.com/oss/)를 사용할 수 있다.
