---
knowledge:
  id: case/batch
  type: rule
---

# batch 실험 기준 {#base}

실험 B는 BAT 규칙을 따라야 한다. 첫 signal은 1로, 둘째 signal은 5로 바꾼다. 구독 계산의 실행 시점과 횟수는 BAT 규칙을 따라야 한다.

# batch 한 번 실행 요구 {#once}

실험 B에서 첫 signal을 1로, 둘째 signal을 5로 바꾸는 동안 구독 계산은 두 변경이 끝난 뒤 한 번 실행해야 한다.

# batch 두 번 실행 요구 {#twice}

실험 B에서 첫 signal을 1로, 둘째 signal을 5로 바꾸는 동안 구독 계산은 각 setter 직후 한 번씩, 총 두 번 실행해야 한다.
