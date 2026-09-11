/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {generateExtendedSound} from '../extension'
import {generateLoopSound} from '../loop'
import type {LoopRequest, SoundRequest} from '../worker'

vi.mock('../loop', () => ({generateLoopSound: vi.fn()}))
vi.mock('../runtime', () => ({generateSound: vi.fn()}))
vi.mock('../extension', () => ({generateExtendedSound: vi.fn()}))

const scope = {
  onmessage: undefined as
    | ((event: {data: SoundRequest | LoopRequest}) => Promise<void>)
    | undefined,
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
  vi.mocked(generateExtendedSound).mockImplementation(async (_prompt, _seconds, progress) => {
    progress('generation step')
    return blob
  })
  expect(scope.onmessage).toBeTypeOf('function')
  await scope.onmessage?.({data: request})
  expect(generateExtendedSound).toHaveBeenCalledWith(
    request.prompt,
    request.seconds,
    expect.any(Function),
    undefined,
  )
  expect(scope.postMessage.mock.calls).toEqual([
    [{message: 'generation step', type: 'progress'}],
    [{blob, type: 'result'}],
  ])
})

it.each([new Error('download failed'), 'download failed'])(
  'should serialize a generation failure without sending a result: %s',
  async (failure) => {
    vi.mocked(generateExtendedSound).mockRejectedValue(failure)
    await scope.onmessage?.({data: request})
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({
      message: 'download failed',
      type: 'error',
    })
  },
)

it('should forward custom overlap to the extension module', async () => {
  await scope.onmessage?.({data: {...request, overlapSeconds: 8}})
  expect(generateExtendedSound).toHaveBeenCalledWith(
    request.prompt,
    request.seconds,
    expect.any(Function),
    8,
  )
})

it('should route a loop request with its source and transition to loop generation', async () => {
  const source = new Blob(['source'])
  const result = new Blob(['loop'])
  vi.mocked(generateLoopSound).mockResolvedValue(result)
  await scope.onmessage?.({data: {prompt: 'rain', source, transitionSeconds: 6, type: 'loop'}})
  expect(generateLoopSound).toHaveBeenCalledWith(source, 'rain', expect.any(Function), 6)
  expect(scope.postMessage).toHaveBeenCalledWith({blob: result, type: 'result'})
  expect(generateExtendedSound).not.toHaveBeenCalled()
})
