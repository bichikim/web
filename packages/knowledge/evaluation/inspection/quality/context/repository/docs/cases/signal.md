---
knowledge:
  id: case/signal
  type: rule
---

# signal 실험 기준 {#base}

실험 S는 SIG 규칙을 따라야 한다. 초기값은 7이고 setter에 다시 7을 전달한다. 구독 계산의 실행 여부는 SIG 규칙을 따라야 한다.

# signal 갱신 요구 {#update}

실험 S에서 초기값 7인 signal의 setter에 7을 전달하면 구독 계산을 한 번 실행해야 한다.

# signal 갱신 억제 요구 {#suppress}

실험 S에서 초기값 7인 signal의 setter에 7을 전달하면 구독 계산을 실행하면 안 된다.
