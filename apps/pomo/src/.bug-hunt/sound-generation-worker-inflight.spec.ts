/** @vitest-environment node */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {generateExtendedSound} from '../features/sound-generation/extension'
import type {SoundRequest} from '../features/sound-generation/worker'

vi.mock('../features/sound-generation/loop', () => ({generateLoopSound: vi.fn()}))
vi.mock('../features/sound-generation/runtime', () => ({generateSound: vi.fn()}))
vi.mock('../features/sound-generation/extension', () => ({generateExtendedSound: vi.fn()}))

const scope = {
  onmessage: undefined as ((event: {data: SoundRequest}) => Promise<void>) | undefined,
  postMessage: vi.fn(),
}
const request = {prompt: 'rain on leaves', seconds: 120}

beforeEach(async () => {
  vi.resetModules()
  scope.onmessage = undefined
  scope.postMessage.mockClear()
  vi.stubGlobal('self', scope)
  await import('../features/sound-generation/worker')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

it('should ignore a concurrent generation request while one is in flight', async () => {
  const firstGeneration = Promise.withResolvers<void>()
  const blob = new Blob(['audio'], {type: 'audio/wav'})
  vi.mocked(generateExtendedSound).mockImplementationOnce(async (_prompt, _seconds, progress) => {
    progress('generation step')
    await firstGeneration.promise
    return blob
  })

  expect(scope.onmessage).toBeTypeOf('function')
  const first = scope.onmessage?.({data: request})
  await vi.waitFor(() => expect(generateExtendedSound).toHaveBeenCalledOnce())

  const second = scope.onmessage?.({data: {...request, prompt: 'wind through trees'}})
  firstGeneration.resolve()
  await Promise.all([first, second])

  expect(generateExtendedSound).toHaveBeenCalledOnce()
  expect(
    scope.postMessage.mock.calls.filter(([message]) => message.type === 'result'),
  ).toHaveLength(1)
})
