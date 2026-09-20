/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {generateExtendedSound} from '../features/sound-generation/extension'
import type {SoundRequest} from '../features/sound-generation/worker'

vi.mock('../features/sound-generation/extension', () => ({generateExtendedSound: vi.fn()}))

const scope = {
  onmessage: undefined as ((event: {data: SoundRequest}) => Promise<void>) | undefined,
  postMessage: vi.fn(),
}
const firstRequest = {prompt: 'rain on leaves', seconds: 120}
const secondRequest = {prompt: 'ocean waves', seconds: 90}

beforeEach(async () => {
  vi.resetModules()
  scope.onmessage = undefined
  scope.postMessage.mockClear()
  vi.stubGlobal('self', scope)
  await import('../features/sound-generation/worker')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should run only one generation at a time in the worker', async () => {
  const firstGeneration = Promise.withResolvers<Blob>()
  const secondGeneration = Promise.withResolvers<Blob>()
  vi.mocked(generateExtendedSound)
    .mockReturnValueOnce(firstGeneration.promise)
    .mockReturnValueOnce(secondGeneration.promise)
  expect(scope.onmessage).toBeTypeOf('function')

  const firstRun = scope.onmessage?.({data: firstRequest})
  const secondRun = scope.onmessage?.({data: secondRequest})

  expect(generateExtendedSound).toHaveBeenCalledTimes(1)
  expect(generateExtendedSound).toHaveBeenCalledWith(
    firstRequest.prompt,
    firstRequest.seconds,
    expect.any(Function),
    expect.objectContaining({negativePrompt: undefined}),
  )

  firstGeneration.resolve(new Blob(['first'], {type: 'audio/wav'}))
  await firstRun

  expect(scope.postMessage).toHaveBeenCalledWith({
    blob: expect.any(Blob),
    type: 'result',
  })
  expect(generateExtendedSound).toHaveBeenCalledTimes(1)

  await secondRun

  expect(generateExtendedSound).toHaveBeenCalledTimes(1)
  expect(scope.postMessage).toHaveBeenCalledTimes(1)
})
