import {expect, it, vi} from 'vitest'
import {createResumableModelFetch, type PartialDownloadStorage} from '../resumable-fetch'
import {createPartialStorage} from './support/partial-storage'

const MODEL_URL = 'https://models.test/model.onnx'
const BYTES_PER_MEBIBYTE = 1_048_576
const PARTIAL_BATCH_MEBIBYTES = 8
const PARTIAL_BATCH_BYTES = PARTIAL_BATCH_MEBIBYTES * BYTES_PER_MEBIBYTE

const openModelStream = async (
  source: ReadableStream<Uint8Array>,
  totalBytes: number,
  partialStorage: PartialDownloadStorage,
) => {
  const resumable = createResumableModelFetch({
    fetcher: async () =>
      new Response(source, {
        headers: {'accept-ranges': 'bytes', 'content-length': String(totalBytes), etag: '"model"'},
      }),
    partialStorage,
  })
  const response = await resumable.fetch(MODEL_URL)
  return response.body!.getReader()
}

it('should persist only the already-read prefix when a pending network read finishes during cancellation', async () => {
  const prefix = Uint8Array.of(1, 2)
  const tail = new Uint8Array(PARTIAL_BATCH_BYTES)
  const partial = createPartialStorage()
  const writeStarted = Promise.withResolvers<void>()
  const releaseWrite = Promise.withResolvers<void>()
  const append = vi.mocked(partial.storage.append)
  const persist = append.getMockImplementation()!
  append.mockImplementationOnce(async (url, bytes) => {
    writeStarted.resolve()
    await releaseWrite.promise
    await persist(url, bytes)
  })

  const readStarted = Promise.withResolvers<void>()
  const releaseRead = Promise.withResolvers<void>()
  const tailEnqueued = Promise.withResolvers<void>()
  const cancelSource = vi.fn()
  const source = new ReadableStream<Uint8Array>(
    {
      cancel: (reason) => cancelSource(reason),
      async pull(controller) {
        readStarted.resolve()
        await releaseRead.promise
        controller.enqueue(tail)
        tailEnqueued.resolve()
      },
      start: (controller) => controller.enqueue(prefix),
    },
    {highWaterMark: 0},
  )

  const reader = await openModelStream(source, prefix.byteLength + tail.byteLength, partial.storage)
  expect((await reader.read()).value).toEqual(prefix)
  const pendingRead = reader.read()
  await readStarted.promise

  const cancellation = reader.cancel('stop')
  await writeStarted.promise
  releaseRead.resolve()
  await tailEnqueued.promise
  releaseWrite.resolve()
  await cancellation

  expect((await pendingRead).done).toBe(true)
  expect(cancelSource).toHaveBeenCalledExactlyOnceWith('stop')
  expect(partial.getPartial()?.body.byteLength).toBe(prefix.byteLength)
  expect(partial.getPartial()?.body).toEqual(prefix)
})

it('should finish an in-flight partial write before cancelling the source', async () => {
  const batch = new Uint8Array(PARTIAL_BATCH_BYTES)
  const partial = createPartialStorage()
  const writeStarted = Promise.withResolvers<void>()
  const releaseWrite = Promise.withResolvers<void>()
  const events: string[] = []
  const append = vi.mocked(partial.storage.append)
  const persist = append.getMockImplementation()!
  append.mockImplementationOnce(async (url, bytes) => {
    writeStarted.resolve()
    await releaseWrite.promise
    await persist(url, bytes)
    events.push('persisted')
  })

  const cancelSource = vi.fn<(reason: unknown) => void>(() => {
    events.push('cancelled')
  })
  const source = new ReadableStream<Uint8Array>({
    cancel: (reason) => cancelSource(reason),
    start: (controller) => controller.enqueue(batch),
  })

  const reader = await openModelStream(source, batch.byteLength + 1, partial.storage)
  const pendingRead = reader.read()
  await writeStarted.promise

  const cancellation = reader.cancel('stop')
  expect((await pendingRead).done).toBe(true)
  releaseWrite.resolve()
  await cancellation

  expect(events).toEqual(['persisted', 'cancelled'])
  expect(cancelSource).toHaveBeenCalledExactlyOnceWith('stop')
  expect(partial.getPartial()?.body.byteLength).toBe(batch.byteLength)
})
