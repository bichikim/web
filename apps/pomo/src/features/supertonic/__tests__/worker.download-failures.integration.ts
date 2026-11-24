/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'
import type {Result} from 'src/features/result'
import type {SupertonicError} from '@winter-love/supertonic/errors'
import type {LoadBufferOptions} from '@winter-love/supertonic/sessions'
import {
  assetMocks,
  failure,
  httpMocks,
  initialize,
  jsonResponse,
  loadWorker,
  modelResource,
  sessionMocks,
  storageMocks,
  validationError,
} from './fixtures/worker'

describe('initialization download failures', () => {
  it.each([
    {expectedRetryable: false, status: 400},
    {expectedRetryable: false, status: 401},
  ])('should report manifest HTTP $status without retry', async ({expectedRetryable, status}) => {
    httpMocks.fetch.mockResolvedValue(jsonResponse({}, status))
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {
        error: {
          code: 'download-failed',
          fileName: '모델 자산 설정',
          phase: 'download',
          retryable: expectedRetryable,
          status,
        },
        requestId: null,
        type: 'error',
      },
      [],
    )
  })

  it.each([
    {error: new DOMException('cancelled', 'AbortError'), expectedCode: 'cancelled'},
    {error: new Error('offline'), expectedCode: 'download-failed'},
  ])(
    'should classify manifest fetch exceptions as $expectedCode',
    async ({error, expectedCode}) => {
      httpMocks.fetch.mockRejectedValue(error)
      const worker = await loadWorker()

      await initialize(worker)

      expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({code: expectedCode}),
          requestId: null,
          type: 'error',
        }),
        [],
      )
    },
  )

  it('should return a retryable 408 config response', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(options.url.endsWith('tts.json') ? jsonResponse({}, 408) : jsonResponse()),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({code: 'download-failed', retryable: true, status: 408}),
      }),
      [],
    )
  })

  it('should return a retryable 429 indexer response after config succeeds', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url.endsWith('unicode_indexer.json') ? jsonResponse({}, 429) : jsonResponse(),
      ),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({code: 'download-failed', retryable: true, status: 429}),
      }),
      [],
    )
  })

  it('should classify aborted config loading as cancellation', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) => {
      if (options.url.endsWith('tts.json')) {
        throw new DOMException('cancelled', 'AbortError')
      }

      return modelResource(jsonResponse())
    })
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: {code: 'cancelled', phase: 'download', retryable: false}}),
      [],
    )
  })

  it('should report a generic indexer loading exception', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) => {
      if (options.url.endsWith('unicode_indexer.json')) {
        throw new Error('offline')
      }

      return modelResource(jsonResponse())
    })
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({code: 'download-failed', retryable: true, status: null}),
      }),
      [],
    )
  })

  it('should return initialization asset validation failures', async () => {
    assetMocks.parse.mockReturnValue(failure(validationError))
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      {error: validationError, requestId: null, type: 'error'},
      [],
    )
  })

  it('should return retryable server errors from model buffer loading', async () => {
    storageMocks.load.mockImplementation(async (options: {url: string}) =>
      modelResource(
        options.url.endsWith('.onnx') ? new Response(null, {status: 500}) : jsonResponse(),
      ),
    )
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) =>
        options.loadBuffer({
          expectedSize: 1,
          fileName: '모델 파일',
          loadedBefore: 0,
          signal: new AbortController().signal,
          totalBytes: 1,
          url: 'https://models.test/model.onnx',
        }),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({retryable: true, status: 500}),
      }),
      [],
    )
  })

  it.each([
    {error: new DOMException('cancelled', 'AbortError'), expectedCode: 'cancelled'},
    {error: new Error('offline'), expectedCode: 'download-failed'},
  ])('should classify model buffer exceptions as $expectedCode', async ({error, expectedCode}) => {
    storageMocks.load.mockImplementation(async (options: {url: string}) => {
      if (options.url.endsWith('.onnx')) {
        throw error
      }

      return modelResource(jsonResponse())
    })
    sessionMocks.load.mockImplementation(
      async (options: {
        loadBuffer: (
          bufferOptions: LoadBufferOptions,
        ) => Promise<Result<ArrayBuffer, SupertonicError>>
      }) =>
        options.loadBuffer({
          expectedSize: 1,
          fileName: '모델 파일',
          loadedBefore: 0,
          signal: new AbortController().signal,
          totalBytes: 1,
          url: 'https://models.test/model.onnx',
        }),
    )
    const worker = await loadWorker()

    await initialize(worker)

    expect(worker.scope.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({error: expect.objectContaining({code: expectedCode})}),
      [],
    )
  })
})
