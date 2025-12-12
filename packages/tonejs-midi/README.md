# Solid Use

## Parameter Passing Rule

### Element

When accepting an Element as a parameter, always allow for the absence of a value using `null`. Do not use `undefined` or require a non-null value. As with other parameters, use `MaybeAccessor`. Most JS APIs (e.g., `window.querySelector`) return `null` if no element is found.

**Do This:**
```ts
import {MaybeAccessor} from 'src/use'
const useFoo = (element: MaybeAccessor<Element | null>) => {
  // do something
}
```

**Don't Do This:**
```ts
import {MaybeAccessor} from 'src/use'
const useFoo = (element: MaybeAccessor<Element | undefined>) => {
  // do something
}
const useBar = (element: MaybeAccessor<Element>) => {
  // do something
}
const useJohn = (element: Element) => {
  // do something
}
```

