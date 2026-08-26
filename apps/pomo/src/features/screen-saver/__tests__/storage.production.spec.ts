import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('should create the production preference schema without the development-only delay', async () => {
  vi.stubEnv('DEV', false)
  vi.resetModules()

  const storage = await import('../storage')

  expect(storage.readScreenSaverDelay).toBeTypeOf('function')
})
