---
knowledge:
  id: operations/clients
  type: rule
---

# 원격 함수 공유 함수별 완료 조건 {#policy}

- 일반 웹의 서버 함수가 기존 self Origin `/_server`를 사용한다.
- 토스 클라이언트 번들의 서버 함수만 `POMO_PUBLIC_ORIGIN/_server`를 사용한다.
- 토스 번들의 JS, CSS, Worker, 이미지 주소는 패키지 내부 경로를 유지한다.
