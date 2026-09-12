---
knowledge:
  id: reference/batch
  type: rule
---

# BAT 규칙: SolidJS batch의 동기 갱신 {#policy}

공식 설명 요약: batch는 하위 계산의 실행을 묶음 끝까지 미룬다. 여러 갱신을 묶으면 각 갱신마다 실행하는 대신 끝에서 한 번 실행한다. 중첩된 batch는 하나의 큰 묶음으로 동작한다. 묶음 안에서 오래된 값을 직접 읽으면 필요에 따라 계산한다. 비동기 함수에서는 첫 await 이전까지만 묶는다.

실험용 정의: BAT 규칙은 하나의 동기 batch 안에서 두 signal의 setter를 각각 한 번 호출하는 절차다. 이미 두 signal을 구독한 계산 하나를 관찰한다. 두 초기값은 모두 0이다. 묶음 안에서 계산값을 읽지 않고 await도 사용하지 않는다. 초기 구독 실행은 횟수에서 제외한다.

출처: https://docs.solidjs.com/reference/reactive-utilities/batch
확인일: 2026-09-08. 공식 설명과 별도의 실험 정의를 구분한 요약이며 공식 원문 전체가 아니다.
