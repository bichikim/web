# Clamp finite number

숫자를 지정한 범위로 제한합니다. 기본적으로 값이 없거나 유한하지 않으면 undefined를 반환하며, `isInvalid`와 `fallback` 옵션으로 판단 기준과 반환값을 지정할 수 있습니다. `undefined` 입력은 항상 문제 값으로 처리합니다. 반환 타입에는 지정한 fallback의 타입이 반영됩니다. 구현은 [index.ts](./index.ts)를 참고합니다.

## 검토 상태

- [x] 사용자 검토 완료 (2026-10-22)
