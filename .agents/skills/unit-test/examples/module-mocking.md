# Module mocking

Do not use vitest, other modules, or any logic inside the mocking function. Only `vi.fn()` is allowed.

## Basic mocking

```ts
import {afterEach, it, vi} from 'vitest'
import {Router} from '@solidjs/router'

vi.mock('@solidjs/router', () => {
  return {
    Router: vi.fn(),
  }
})

// Must clear mocks
afterEach(() => {
  vi.clearAllMocks()
})

it('should mock @solidjs/router', () => {
  // Concretely specify mocking before the test here
  vi.mocked(Router).mockImplementation((props: any) => {
    if (props.root) {
      return props.root({children: props.children})
    }

    return props.children
  })
})
```

## When partial actual module is needed

```ts
import {vi} from 'vitest'

vi.mock('@solidjs/router', async () => {
  const actual: typeof import('@solidjs/router') = await vi.importActual('@solidjs/router')

  return {
    // Mock while preserving part of the actual module
    ...actual,
    // Return actual module wrapped by mock function
    Route: vi.fn(actual.Route),
    // Mock the Router function
    Router: vi.fn(),
  }
})
```
