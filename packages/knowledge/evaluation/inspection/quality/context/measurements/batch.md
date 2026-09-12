---
knowledge:
  id: measurement/batch
  type: rule
---

# BAT 실험 B의 실행값 {#policy}

실험 기록이며 SolidJS 공식 문서의 인용이 아니다. 2026-09-08, 설치된 SolidJS 1.9.14 클라이언트 반응성 런타임을 Node의 browser export 조건으로 실행했다.

BAT 규칙에 따라 하나의 동기 batch 안에서 초기값이 각각 0인 signal을 1과 5로 변경했다. 두 signal을 이미 구독한 createComputed 하나를 관찰했다. await와 묶음 안의 계산값 읽기는 없었고 초기 구독 실행은 횟수에서 제외했다. 구독 계산은 두 setter가 끝난 뒤 한 번 실행됐고 그때 관찰한 값은 [1, 5]였다. 각 setter 직후 따로 실행되는 과정은 없었다.

측정 코드: packages/knowledge/evaluation/inspection/quality/context/measure.mjs. batches는 [[1, 5]]이며 assertion을 통과했다. 이 실행값은 실험 B의 조건에 한정한다.
