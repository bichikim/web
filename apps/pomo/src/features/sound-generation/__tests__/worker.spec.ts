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
    {chunkNoiseMode: undefined, connectionSeconds: undefined, negativePrompt: undefined},
  )
  expect(scope.postMessage.mock.calls).toEqual([
    [{message: 'generation step', type: 'progress'}],
    [{blob, type: 'result'}],
  ])
})

it('should reject overlapping requests and accept a request after the active one finishes', async () => {
  const firstResult = new Blob(['first'], {type: 'audio/wav'})
  const secondResult = new Blob(['second'], {type: 'audio/wav'})
  let finish: (blob: Blob) => void = () => {}
  vi.mocked(generateExtendedSound).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  vi.mocked(generateExtendedSound).mockResolvedValue(secondResult)

  const first = scope.onmessage?.({data: request})
  await scope.onmessage?.({data: {...request, prompt: 'ocean waves'}})

  expect(generateExtendedSound).toHaveBeenCalledOnce()
  expect(scope.postMessage).toHaveBeenCalledWith({
    message: '이미 환경음을 생성하고 있습니다.',
    type: 'error',
  })

  finish(firstResult)
  await first
  await scope.onmessage?.({data: {...request, prompt: 'forest wind'}})

  expect(generateExtendedSound).toHaveBeenCalledTimes(2)
  expect(scope.postMessage).toHaveBeenCalledWith({blob: firstResult, type: 'result'})
  expect(scope.postMessage).toHaveBeenCalledWith({blob: secondResult, type: 'result'})
})

it.each([new Error('download failed'), 'download failed'])(
  'should serialize a generation failure and allow a retry: %s',
  async (failure) => {
    const retryResult = new Blob(['retry'], {type: 'audio/wav'})
    vi.mocked(generateExtendedSound)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(retryResult)
    await scope.onmessage?.({data: request})
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith({
      message: 'download failed',
      type: 'error',
    })

    await scope.onmessage?.({data: request})
    expect(scope.postMessage).toHaveBeenCalledWith({blob: retryResult, type: 'result'})
  },
)

it.each([0, 8])(
  'should forward custom connection duration %s to the extension module',
  async (connectionSeconds) => {
    await scope.onmessage?.({data: {...request, connectionSeconds}})
    expect(generateExtendedSound).toHaveBeenCalledWith(
      request.prompt,
      request.seconds,
      expect.any(Function),
      {chunkNoiseMode: undefined, connectionSeconds, negativePrompt: undefined},
    )
  },
)

it('should forward a negative prompt to extended generation', async () => {
  const negativePrompt = 'rain, rainfall, thunder'
  await scope.onmessage?.({data: {...request, negativePrompt}})

  expect(generateExtendedSound).toHaveBeenCalledWith(
    request.prompt,
    request.seconds,
    expect.any(Function),
    {chunkNoiseMode: undefined, connectionSeconds: undefined, negativePrompt},
  )
})

it('should route a loop request with its source and connection duration to loop generation', async () => {
  const source = new Blob(['source'])
  const result = new Blob(['loop'])
  vi.mocked(generateLoopSound).mockResolvedValue(result)
  await scope.onmessage?.({data: {connectionSeconds: 6, prompt: 'rain', source, type: 'loop'}})
  expect(generateLoopSound).toHaveBeenCalledWith(source, 'rain', expect.any(Function), 6)
  expect(scope.postMessage).toHaveBeenCalledWith({blob: result, type: 'result'})
  expect(generateExtendedSound).not.toHaveBeenCalled()
})

it('should forward the selected chunk noise mode to extended generation', async () => {
  await scope.onmessage?.({data: {...request, chunkNoiseMode: 'repeat'}})

  expect(generateExtendedSound).toHaveBeenCalledWith(
    request.prompt,
    request.seconds,
    expect.any(Function),
    {chunkNoiseMode: 'repeat', connectionSeconds: undefined, negativePrompt: undefined},
  )
})
