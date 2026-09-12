---
knowledge:
  id: reference/signal
  type: rule
---

# SIG 규칙: SolidJS createSignal의 명시적 equals 옵션 {#policy}

공식 설명 요약: createSignal에 `equals: false`를 지정하면 이전 값과 같더라도 갱신을 전달한다. 사용자 비교 함수가 true를 반환하면 갱신을 막고, false를 반환하면 갱신을 전달한다.

실험용 정의: SIG 규칙은 `equals: false`를 지정한 createSignal을 뜻한다. SIG 실험은 이미 구독이 성립한 계산 하나를 관찰한다. setter를 한 번 호출하고 batch를 사용하지 않는다. 초기 구독 실행은 횟수에서 제외한다.

출처: https://docs.solidjs.com/reference/basic-reactivity/create-signal
확인일: 2026-09-08. 공식 설명과 별도의 실험 정의를 구분한 요약이며 공식 원문 전체가 아니다.
