---
knowledge:
  id: case/lifetime
  type: rule
---

# 공유 캐시의 유효 기간

## 규칙 A {#left}

공유 HTTP 캐시는 `Cache-Control: max-age=60, s-maxage=300` 응답의 freshness lifetime을 해당 지시의 우선순위에 따라 정한다.

## 규칙 B {#right}

공유 HTTP 캐시는 `Cache-Control: max-age=60, s-maxage=300` 응답의 freshness lifetime을 300초로 정한다.
