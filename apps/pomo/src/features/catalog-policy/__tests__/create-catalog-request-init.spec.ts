import {afterEach, expect, it, vi} from 'vitest'
import {createCatalogRequestInit} from '..'

afterEach(() => vi.unstubAllEnvs())

it.each([true, false])('should use development-aware cache policy for DEV=%s', (development) => {
  vi.stubEnv('DEV', development)
  const controller = new AbortController()
  const options = createCatalogRequestInit(controller.signal)
  expect(options.cache).toBe(development ? 'no-store' : 'default')
  expect(options.signal).toBe(controller.signal)
  controller.abort()
  expect(options.signal?.aborted).toBe(true)
})

it('should allow requests without a cancellation signal', () => {
  expect(createCatalogRequestInit().signal).toBeUndefined()
})
