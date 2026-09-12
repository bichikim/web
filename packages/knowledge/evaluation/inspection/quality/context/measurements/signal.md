---
knowledge:
  id: measurement/signal
  type: rule
---

# SIG 실험 S의 실행값 {#policy}

실험 기록이며 SolidJS 공식 문서의 인용이 아니다. 2026-09-08, 설치된 SolidJS 1.9.14 클라이언트 반응성 런타임을 Node의 browser export 조건으로 실행했다.

SIG 규칙에 따라 `equals: false`를 지정했다. 초기값 7인 signal을 createComputed 하나가 이미 구독한 뒤 setter에 7을 한 번 전달했다. batch는 사용하지 않았고 초기 구독 실행은 횟수에서 제외했다. 측정 결과, 구독 계산이 한 번 실행됐다. 같은 값의 갱신이 이 실험에서 구독 계산의 재실행으로 이어지는 것을 확인했다.

측정 코드: packages/knowledge/evaluation/inspection/quality/context/measure.mjs. signalCalls는 1이며 assertion을 통과했다. 이 실행값은 실험 S의 조건에 한정한다.
