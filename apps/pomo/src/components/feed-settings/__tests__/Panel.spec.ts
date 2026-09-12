/** @vitest-environment node */
import {clientOnly} from '@solidjs/start'
import {beforeEach, expect, it, vi} from 'vitest'
vi.mock('@solidjs/start', () => ({clientOnly: vi.fn()}))
vi.mock('../Content', () => ({PFeedSettingsContent: vi.fn()}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.mocked(clientOnly).mockReturnValue(vi.fn() as unknown as ReturnType<typeof clientOnly>)
})
it('should register and load its client component lazily', async () => {
  await import('../Panel')
  expect(clientOnly).toHaveBeenCalledWith(expect.any(Function), {lazy: true})
  const loader = vi.mocked(clientOnly).mock.calls.at(-1)?.[0]
  expect((await loader?.())?.default).toEqual(expect.any(Function))
})
