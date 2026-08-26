import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('should classify root routes for the Apps in Toss build', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  vi.resetModules()
  const {getPomoHomeHref, isPomoHomePath, isSearchIndexablePath, usesPomoLayout} =
    await import('../pomo-route')

  expect(getPomoHomeHref('ko')).toBe('/')
  expect(isPomoHomePath('/')).toBeTruthy()
  expect(isSearchIndexablePath('/')).toBe(false)
  expect(usesPomoLayout('/')).toBe(true)
})
