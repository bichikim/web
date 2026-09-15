/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
vi.mock('../PMusicPlayerContent', () => ({PMusicPlayerContent: vi.fn()}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})
it('should expose the music player content for server rendering', async () => {
  const [{PMusicPlayerPanel}, {PMusicPlayerContent}] = await Promise.all([
    import('../PMusicPlayerPanel'),
    import('../PMusicPlayerContent'),
  ])

  expect(PMusicPlayerPanel).toBe(PMusicPlayerContent)
})
