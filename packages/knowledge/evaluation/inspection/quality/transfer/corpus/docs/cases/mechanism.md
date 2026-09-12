---
knowledge:
  id: case/mechanism
  type: rule
---

# 응답 저장 주체

## 규칙 A {#left}

HTTP 캐시는 `Cache-Control: no-store` 응답을 HTTP 캐시에 저장하지 않는다.

## 규칙 B {#right}

서비스 워커 스크립트는 같은 `Cache-Control: no-store` 응답을 Cache API에 명시적으로 저장한다.
