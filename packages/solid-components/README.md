# Solid Use

## 파라미터 전달 룰

### Element

Element 는 최소한 모양을 전달 받는다 없는 값은 null 로 한다
다른 파라미터와 마찬가지로 MaybeAccessor 를 사용한다
js 기본 함수들이 null 을 리턴한다 window.querySelector 등

Do This
```ts
import {MaybeAccessor} from 'src/use'
const useFoo = (element: MayBeAccessor<Element | null>) => {
  // do something
}
```

Don't Do This
```ts
import {MaybeAccessor} from 'src/use'
const useFoo = (element: MayBeAccessor<Element | undefined>) => {
  // do something
}
const useBar = (element: MayBeAccessor<Element>) => {
  // do something
}
const useJohn = (element: Element) => {
  // do something
}
```

```tsx
<FooRoot>
  <ForInput />
  <FooBody />
  <FooLabel />
  <FooContent />
  <FooIndicator />
</FooRoot>
```
