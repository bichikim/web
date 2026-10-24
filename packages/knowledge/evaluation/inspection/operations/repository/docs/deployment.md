---
knowledge:
  id: operations/deployment
  type: rule
---

# Pomo 운영 배포와 복구 {#policy}

`main`의 운영 배포는 GitHub Actions에서 `.github/workflows/pomo-production-deploy.yml`을 수동으로
실행한다. `main` push만으로는 배포하지 않는다. 먼저 운영 환경 설정으로 빌드한다. Vercel
Production 환경의 Neon 직접 연결 URL인
`DATABASE_URL_UNPOOLED`로 Drizzle migration을 적용하고, 같은 빌드 산출물을 운영 후보로
배포한다. 후보의 `/`와 DB를 읽는 RSS 경로가 스모크 테스트를 통과할 때만 운영 도메인으로
승격한다. 빌드, migration 또는 스모크 테스트가 실패하면 운영 도메인을 변경하지 않는다. 중복
배포를 막기 위해 모든 브랜치의 Vercel Git 자동 배포를 끄고 GitHub Actions만 배포한다. GitHub에는
`VERCEL_TOKEN` secret을 설정한다. Gateway가 먼저 배포된 뒤 Pomo 배포가 실패하거나 취소되면
workflow가 배포 직전에 기록한 Gateway version으로 되돌린다.
