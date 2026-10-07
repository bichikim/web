import {describe, expect, it, vi} from 'vitest'
import type {CodeDocument} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {readMediaBlob} from '../read-media-blob'

describe('readMediaBlob', () => {
  const document: CodeDocument = {
    lines: [[]],
    location: {column: 1, line: 1, path: 'image.png'},
    media: {kind: 'image', mimeType: 'image/png', size: 4},
    revision: 'first',
    source: '',
  }
  const makePort = (): ViewerPort => ({call: vi.fn(), context: vi.fn(), start: vi.fn()})
  it('should assemble sequential chunks with revision checks and progress', async () => {
    const port = makePort()
    vi.mocked(port.call)
      .mockResolvedValueOnce({content: [], structuredContent: {data: 'AAE=', next: 2}})
      .mockResolvedValueOnce({content: [], structuredContent: {data: 'AgM=', next: 4}})
    const onProgress = vi.fn()
    const blob = await readMediaBlob({
      document,
      onProgress,
      port,
      session: 'session',
      signal: new AbortController().signal,
    })
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([0, 1, 2, 3]))
    expect(blob.type).toBe('image/png')
    expect(port.call).toHaveBeenNthCalledWith(2, 'code.media', {
      offset: 2,
      path: 'image.png',
      revision: 'first',
      session: 'session',
    })
    expect(onProgress).toHaveBeenCalledWith(50)
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })
  it('should stop before the next chunk when cancellation arrives during a request', async () => {
    const port = makePort()
    const controller = new AbortController()
    vi.mocked(port.call).mockImplementation(async () => {
      controller.abort()
      return {content: [], structuredContent: {data: 'AAE=', next: 2}}
    })
    const onProgress = vi.fn()
    await expect(
      readMediaBlob({document, onProgress, port, session: 'session', signal: controller.signal}),
    ).rejects.toMatchObject({name: 'AbortError'})
    expect(port.call).toHaveBeenCalledOnce()
    expect(onProgress).not.toHaveBeenCalled()
  })
  it('should reject malformed chunks without issuing another request', async () => {
    const port = makePort()
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      structuredContent: {data: 'AA==', next: 4},
    })
    await expect(
      readMediaBlob({
        document,
        onProgress: vi.fn(),
        port,
        session: 'session',
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('미디어 데이터를 읽지 못했습니다.')
    expect(port.call).toHaveBeenCalledOnce()
  })
  it('should create an empty Blob without requesting a nonexistent chunk', async () => {
    const port = makePort()
    const empty: CodeDocument = {
      ...document,
      media: {kind: 'image', mimeType: 'image/png', size: 0},
    }
    const blob = await readMediaBlob({
      document: empty,
      onProgress: vi.fn(),
      port,
      session: 'session',
      signal: new AbortController().signal,
    })
    expect(blob.size).toBe(0)
    expect(port.call).not.toHaveBeenCalled()
  })
})
