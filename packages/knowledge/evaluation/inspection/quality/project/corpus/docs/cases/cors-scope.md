---
knowledge:
  id: case/cors-scope
  type: rule
---

# cors-scope

## 규칙 A {#left}

Vercel 서버 함수를 포함한 `/api/*` HTTP API는 환경별 CORS 허용 출처 목록만 허용한다. 앱인토스 출처는 아래 네 개를 사용하며, Origin은 경로와 끝 `/`없이 정확히 비교한다.

## 규칙 B {#right}

Cloudflare R2 `pomofi-audio` 버킷은 `storage.pomofi.io` 사용자 지정 도메인으로 제공한다. 프리뷰 주소를 포함한 모든 Origin의 `GET`, `HEAD`, `PUT`을 허용한다. CORS는 브라우저의 Origin 제약만 완화하며, `PUT` 권한은 서버가 발급하는 짧은 수명의 서명 URL로 통제한다. 오디오 범위 요청을 위해 `Range` 요청 헤더와 `Accept-Ranges`, `Content-Length`, `Content-Range`, `Content-Type`, `ETag` 응답 헤더 노출을 유지한다. 정책 원본은 [`r2/cors.json`](./r2/cors.json)이며 `pnpm exec wrangler r2 bucket cors set pomofi-audio --file apps/pomo/docs/plan/development/r2/cors.json`으로 적용한다.
