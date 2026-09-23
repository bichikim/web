---
knowledge:
  id: operations/remote
  type: rule
---

# 원격 함수 상태와 계약 {#policy}

원격 함수 연결 기반은 구현되었다. 앱인토스와 데스크톱 정적 클라이언트의 SolidStart 서버 함수는
`POMO_PUBLIC_ORIGIN`에 배포된 SSR 서버를 호출한다. 일반 웹은 현재 페이지의 self Origin을 계속
사용한다.
