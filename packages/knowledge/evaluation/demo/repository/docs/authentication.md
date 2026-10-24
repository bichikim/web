---
knowledge:
  id: auth/session
  type: rule
  language: ko
  tags: [auth]
---

# 인증 토큰 갱신 {#refresh}

액세스 토큰이 만료되면 refresh token으로 새 토큰을 발급한다.
갱신 요청은 동시에 하나만 실행하고, 갱신에 실패하면 로그인 화면으로 이동한다.
