import {getRequestEvent} from 'solid-js/web'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getPublicAssetUrl} from '../index'

vi.mock('solid-js/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js/web')>()

  return {...actual, getRequestEvent: vi.fn()}
})

beforeEach(() => {
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'false')
  vi.stubEnv('POMO_PUBLIC_ASSET_ORIGIN', 'https://www.pomofi.io')
  vi.mocked(getRequestEvent).mockReturnValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should preserve a root-relative path in the browser', () => {
  expect(getPublicAssetUrl('/versions.json')).toBe('/versions.json')
})

it('should use the matching trusted request origin during SSR', () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://www.pomofi.io/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(getPublicAssetUrl('/versions.json')).toBe('https://www.pomofi.io/versions.json')
})

it('should allow a local request origin when configured for local rendering', () => {
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'true')
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('http://localhost:3000/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(getPublicAssetUrl('/versions.json')).toBe('http://localhost:3000/versions.json')
})

it('should reject an untrusted request origin during SSR', () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://example.invalid/whats-new'),
  } as ReturnType<typeof getRequestEvent>)

  expect(getPublicAssetUrl('/versions.json')).toBe('https://www.pomofi.io/versions.json')
})
