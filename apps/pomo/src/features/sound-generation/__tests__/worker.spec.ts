/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {generateSound} from '../runtime'
import type {SoundRequest} from '../worker'

vi.mock('../runtime', () => ({generateSound: vi.fn()}))

const scope = {
  onmessage: undefined as ((event: {data: SoundRequest}) => Promise<void>) | undefined,
  postMessage: vi.fn(),
}
const request = {prompt: 'rain on leaves', seconds: 120}

beforeEach(async () => {
  vi.resetModules()
  scope.onmessage = undefined
  vi.stubGlobal('self', scope)
  await import('../worker')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

it('should forward progress and the generated blob for the requested prompt and duration', async () => {
  const blob = new Blob(['audio'], {type: 'audio/wav'})
  vi.mocked(generateSound).mockImplementation(async (_prompt, _seconds, progress) => {
    progress('generation step')
    return blob
  })
  expect(scope.onmessage).toBeTypeOf('function')
  await scope.onmessage?.({data: request})
  expect(generateSound).toHaveBeenCalledWith(request.prompt, request.seconds, expect.any(Function))
  expect(scope.postMessage.mock.calls).toEqual([
    [{message: 'generation step', type: 'progress'}],
    [{blob, type: 'result'}],
  ])
})

it.each([new Error('download failed'), 'download failed'])(
  'should serialize a generation failure without sending a result: %s',
  async (failure) => {
    vi.mocked(generateSound).mockRejectedValue(failure)
    await scope.onmessage?.({data: request})
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({
      message: 'download failed',
      type: 'error',
    })
  },
)
