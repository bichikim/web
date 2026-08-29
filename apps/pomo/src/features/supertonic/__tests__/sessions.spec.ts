import {expect, it, vi} from 'vitest'

import {failureResult, successResult} from '../../result'
import type {SupertonicError} from '../errors'
import type {SupertonicModel, SupertonicModelFile} from '../model'
import type {SupertonicRuntime} from '../runtime'
import {loadSessions, releaseSessions} from '../sessions'

const files = [
  {key: 'durationPredictor', name: 'duration', path: 'duration.onnx', size: 10},
  {key: 'textEncoder', name: 'encoder', path: 'encoder.onnx', size: 20},
] as const satisfies readonly SupertonicModelFile[]

const model = {
  baseUrl: 'https://models.example.test',
  description: 'test',
  files,
  id: 'full',
  label: 'test',
  preferredBackend: 'wasm',
  size: 30,
  speechPolicy: {
    considerSplitLength: 1,
    locale: 'ko',
    maximumLength: 3,
    recommendedLength: 2,
    silenceDuration: 0.1,
  },
} satisfies SupertonicModel

const createSession = () => ({release: vi.fn(async () => undefined)})
const createRuntime = (create = vi.fn(async () => createSession())) =>
  ({InferenceSession: {create}}) as unknown as SupertonicRuntime

const createOptions = (
  runtime: SupertonicRuntime,
  loadBuffer = vi.fn(async () => successResult(new ArrayBuffer(1))),
  backend: 'wasm' | 'webgpu' = 'wasm',
) => ({backend, loadBuffer, model, runtime, signal: new AbortController().signal})

it('should release every initialized session', async () => {
  const first = createSession()
  const second = createSession()

  await releaseSessions({durationPredictor: first, textEncoder: second} as unknown as Parameters<
    typeof releaseSessions
  >[0])

  expect(first.release).toHaveBeenCalledOnce()
  expect(second.release).toHaveBeenCalledOnce()
})

it('should download and initialize model sessions sequentially', async () => {
  const create = vi.fn(async () => createSession())
  const loadBuffer = vi.fn(async () => successResult(new ArrayBuffer(1)))

  const result = await loadSessions(createOptions(createRuntime(create), loadBuffer))

  expect(result.ok).toBe(true)
  expect(loadBuffer).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({expectedSize: 10, loadedBefore: 0, totalBytes: 30}),
  )
  expect(loadBuffer).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({expectedSize: 20, loadedBefore: 10, totalBytes: 30}),
  )
  expect(create).toHaveBeenCalledTimes(2)
  expect(create).toHaveBeenCalledWith(expect.any(ArrayBuffer), {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    logSeverityLevel: 3,
  })
})

it('should release earlier sessions when a later download fails', async () => {
  const firstSession = createSession()
  const downloadError: SupertonicError = {
    code: 'download-failed',
    fileName: 'encoder',
    phase: 'download',
    retryable: true,
    status: 500,
  }
  const loadBuffer = vi
    .fn()
    .mockResolvedValueOnce(successResult(new ArrayBuffer(1)))
    .mockResolvedValueOnce(failureResult(downloadError))
  const runtime = createRuntime(vi.fn(async () => firstSession))

  const result = await loadSessions(createOptions(runtime, loadBuffer))

  expect(result).toEqual(failureResult(downloadError))
  expect(firstSession.release).toHaveBeenCalledOnce()
})

it.each([
  ['webgpu', new Error('GPU unavailable'), 'GPU unavailable', true],
  ['wasm', 'unknown failure', '알 수 없는 오류', false],
] as const)(
  'should release sessions when the %s backend initialization fails',
  async (backend, failure, detail, retryable) => {
    const firstSession = createSession()
    const create = vi.fn().mockResolvedValueOnce(firstSession).mockRejectedValueOnce(failure)

    const result = await loadSessions(createOptions(createRuntime(create), undefined, backend))

    expect(result).toEqual({
      error: {backend, code: 'backend-failed', detail, phase: 'initialize', retryable},
      ok: false,
    })
    expect(firstSession.release).toHaveBeenCalledOnce()
  },
)
