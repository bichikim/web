# Pomo

집중을 위한 3D 캐릭터, 뽀모도로 타이머와 음악을 제공하는 SolidStart 앱이다.

## 명령

```sh
pnpm --filter @apps/pomo dev
pnpm --filter @apps/pomo build:web
pnpm --filter @apps/pomo build:apps-in-toss
pnpm --filter @apps/pomo typecheck
```

- `build:web`: 브라우저용 SolidStart SSR 빌드
- `build:apps-in-toss`: 앱인토스 패키징 전 단계인 SSG 빌드 (`.output/public`)

기술 및 제품 결정은 [`plan/development.md`](./plan/development.md)에서 확인한다.
외부 코드·모델·데이터·에셋의 라이선스와 배포 조건은
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)에서 관리한다.
