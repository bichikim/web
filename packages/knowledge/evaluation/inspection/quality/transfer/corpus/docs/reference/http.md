---
knowledge:
  id: reference/http
  type: rule
---

# HTTP 응답 캐시 지시 {#policy}

MDN을 바탕으로 작성한 평가용 요약이다. 확인일: 2026-09-08.

HTTP 응답의 `no-cache`는 저장 자체를 금지하지 않는다. HTTP 캐시가 그 응답을 새 요청에 재사용하려면 원본 서버의 검증을 먼저 받아야 한다. 여기서는 방문 기록 복원이 아닌 새 요청만 다룬다.

`max-age`는 응답의 freshness lifetime을 지정한다. 공유 HTTP 캐시는 `s-maxage`가 함께 있으면 `max-age` 대신 `s-maxage`를 적용한다. 개인 HTTP 캐시는 `s-maxage`를 무시한다.

HTTP 응답의 `no-store`는 개인 및 공유 HTTP 캐시에 그 응답을 저장하지 말라는 지시다.

출처: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
