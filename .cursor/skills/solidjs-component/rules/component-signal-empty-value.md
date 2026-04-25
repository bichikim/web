# Optional / absent values in `createSignal`

이 규칙은 **`createSignal`으로 만든 반응형 상태**에만 적용합니다. props·일반 변수·API 타입 등 다른 맥락의 optional 값까지 `null`로 통일하라는 뜻이 아닙니다.

`createSignal`에서 “값이 아직 없음” 또는 “비어 있음”을 표현할 때는 `undefined` 대신 **`null`**을 사용합니다.

- **`null`**: 의도적으로 “없음”을 나타내는 값(빈 슬롯).
- **`undefined`**: 초기화되지 않았거나 생략된 속성 등에 더 가깝고, 시그널의 “명시적 비어 있음”에는 `null`이 일관됩니다.

```tsx
// BAD
const [message, setMessage] = createSignal<string | undefined>(undefined)

// GOOD
const [message, setMessage] = createSignal<string | null>(null)
```

조건부 렌더링은 Solid에서 **`Show`** 컴포넌트 사용이 권장됩니다. `when`에는 **`message()`가 아니라 시그널 getter인 `message`**를 넘겨 구독하도록 하고, 자식을 함수로 두면 그 인자로 현재 값을 받아 `message()`를 반복 호출하지 않아도 됩니다.

```tsx
import {Show, createSignal} from 'solid-js'

export function OptionalMessageBanner() {
  const [message, setMessage] = createSignal<string | null>(null)

  return (
    <>
      <Show when={message}>{(msg) => <p>{msg}</p>}</Show>
    </>
  )
}
```

문자열이면서 “빈 문자열도 유효한 상태”인 경우와 “아직 없음”을 동시에 쓰려면 `string | null`로 두고, 빈 문자열은 별도 의미로 두는 식으로 모델링합니다.
