import {describe, expect, it, vi} from 'vitest'

import {createResumableModelFetch, type PartialDownloadStorage} from '../resumable-fetch'

interface StoredPartial {
  body: Uint8Array
  metadata: Parameters<PartialDownloadStorage['reset']>[0]
}

const createPartialStorage = (initial?: StoredPartial) => {
  let partial = initial
  const createBody = (body: Uint8Array): Blob =>
    ({
      size: body.byteLength,
      stream: () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(body))
            controller.close()
          },
        }),
    }) as Blob
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
      partial === undefined ? null : {body: createBody(partial.body), metadata: partial.metadata},
    ),
    reset: vi.fn(async (metadata) => {
      partial = {body: new Uint8Array(), metadata}
    }),
  }

  return {getPartial: () => partial, storage}
}

const createHeaders = (length: number) => ({
  'accept-ranges': 'bytes',
  'content-length': length.toString(),
  'content-type': 'application/octet-stream',
  etag: 'model-v1',
})

describe('createResumableModelFetch', () => {
  it('should persist a range-capable download while it is consumed', async () => {
    const partial = createPartialStorage()
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: createHeaders(8)}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch('https://models.test/model.onnx')

    expect(await response.text()).toBe('complete')
    expect(new TextDecoder().decode(partial.getPartial()?.body)).toBe('complete')
  })

  it('should request and combine only the missing byte range', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = {
      contentType: 'application/octet-stream',
      etag: 'model-v1',
      lastModified: null,
      totalBytes: 8,
      url,
    }
    const partial = createPartialStorage({body: new TextEncoder().encode('comp'), metadata})
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response('lete', {
          headers: {...createHeaders(4), 'content-range': 'bytes 4-7/8'},
          status: 206,
        }),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch(url)

    expect(await response.text()).toBe('complete')
    const request = fetcher.mock.calls[0]
    expect(new Headers(request?.[1]?.headers).get('range')).toBe('bytes=4-')
    expect(new Headers(request?.[1]?.headers).get('if-range')).toBe('model-v1')
  })

  it('should restart the file when the server does not accept the byte range', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = {
      contentType: 'application/octet-stream',
      etag: 'model-v1',
      lastModified: null,
      totalBytes: 8,
      url,
    }
    const partial = createPartialStorage({body: new TextEncoder().encode('old'), metadata})
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: createHeaders(8)}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch(url)

    expect(await response.text()).toBe('complete')
    expect(new TextDecoder().decode(partial.getPartial()?.body)).toBe('complete')
  })

  it('should return a completed partial file without another network request', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = {
      contentType: 'application/octet-stream',
      etag: 'model-v1',
      lastModified: null,
      totalBytes: 8,
      url,
    }
    const partial = createPartialStorage({body: new TextEncoder().encode('complete'), metadata})
    const fetcher = vi.fn<typeof fetch>()
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch(url)

    expect(await response.text()).toBe('complete')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
