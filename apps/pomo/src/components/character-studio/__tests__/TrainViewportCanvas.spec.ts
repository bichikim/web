import {clientOnly} from '@solidjs/start'
import {beforeEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/start', () => ({clientOnly: vi.fn()}))
vi.mock('../TrainCanvas', () => ({TrainCanvas: vi.fn()}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

it('should lazily load the train canvas through the client-only boundary', async () => {
  await import('../TrainViewportCanvas')
  expect(clientOnly).toHaveBeenCalledWith(expect.any(Function), {lazy: true})
  const loader = vi.mocked(clientOnly).mock.calls.at(-1)?.[0]
  expect(loader).toBeDefined()
  const loaded = await loader!()
  const {TrainCanvas} = await import('../TrainCanvas')
  expect(loaded.default).toBe(TrainCanvas)
})
