import {vi} from 'vitest'
import type {PartialDownloadStorage} from '../../resumable-fetch'

type PartialMetadata = Parameters<PartialDownloadStorage['reset']>[0]

interface StoredPartial {
  body: Uint8Array
  metadata: PartialMetadata
}

interface PartialStorageHarness {
  readonly getPartial: () => StoredPartial | undefined
  readonly storage: PartialDownloadStorage
}

/** 초기 레코드를 빌려 사용하고, 각 호출이 독립된 부분 다운로드 상태와 관찰 포트를 소유합니다. */
export const createPartialStorage = (initial?: StoredPartial): PartialStorageHarness => {
  let partial = initial
  const storage: PartialDownloadStorage = {
    append: vi.fn(async (_url, chunk) => {
      if (partial === undefined) {
        throw new Error('Partial metadata is missing.')
      }

      const body = new Uint8Array(partial.body.byteLength + chunk.byteLength)
      body.set(partial.body)
      body.set(chunk, partial.body.byteLength)
      partial = {...partial, body}
    }),
    delete: vi.fn(async () => {
      partial = undefined
    }),
    get: vi.fn(async () =>
      partial === undefined
        ? null
        : {body: createTestBlob(partial.body), metadata: partial.metadata},
    ),
    reset: vi.fn(async (metadata) => {
      partial = {body: new Uint8Array(), metadata}
    }),
  }

  return {getPartial: () => partial, storage}
}

/** 버퍼 참조와 생성 시 크기를 보존하며, withStream이 false면 stream을 제공하지 않는 대역입니다. */
export const createTestBlob = (body: Uint8Array, withStream = true): Blob =>
  ({
    arrayBuffer: async () => body.buffer,
    size: body.byteLength,
    stream: withStream
      ? () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(body))
              controller.close()
            },
          })
      : undefined,
  }) as unknown as Blob
