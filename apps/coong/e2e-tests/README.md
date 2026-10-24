# E2E Supabase Mocking (SSR)

This app supports dev/E2E-only Supabase mocking for SSR by injecting a mocked client into `event.locals.supabase`.

## How it works

- The middleware `src/middleware/supabase-mock.ts` reads the request header `x-supabase-mock`.
- It accepts either:
  - `preset:<id>` (e.g. `preset:signedIn`)
  - `base64(json)` where `json` matches `SupabaseMockSpec`.
- Presets are provided at runtime via `createSupabaseMockMiddleware(presets)` (see `src/middleware/index.ts` and `src/middleware/supabase-mock.presets.ts`).
- When present, it sets `event.locals.supabase` to a minimal mocked client that implements `supabase.auth.*` methods used by the app.

## Header examples

### Preset

- `x-supabase-mock: preset:signedIn`
- `x-supabase-mock: preset:signedOut`

### base64(json)

JSON:

```json
{
  "mode": "error",
  "mocks": {
    "auth.getUser": {"user": {"id": "u1", "email": "user@example.com"}},
    "auth.signInWithPassword": {"session": {"access_token": "t"}, "user": {"id": "u1"}}
  }
}
```

Send as:

- `x-supabase-mock: <base64(json)>`

## Playwright usage snippet

```ts
import {test} from '@playwright/test'

test('SSR render with mocked supabase', async ({page}) => {
  await page.setExtraHTTPHeaders({
    'x-supabase-mock': 'preset:signedIn',
  })

  await page.goto('/')
})
```
