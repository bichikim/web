---
knowledge:
  id: case/revalidation
  type: rule
---

# 재사용 규칙

## 규칙 A {#left}

HTTP 캐시는 `Cache-Control: no-cache` 응답을 새 요청에 재사용할 때 그 응답 지시를 준수한다. 방문 기록 복원은 대상이 아니다.

## 규칙 B {#right}

HTTP 캐시는 `Cache-Control: no-cache` 응답을 새 요청에 원본 서버의 검증 없이 재사용한다. 방문 기록 복원은 대상이 아니다.
