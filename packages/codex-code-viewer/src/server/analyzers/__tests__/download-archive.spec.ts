/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {downloadArchive} from '../download-archive'

describe('downloadArchive', () => {
  const fetchArchive = vi.fn<typeof fetch>()
  beforeEach(() => vi.stubGlobal('fetch', fetchArchive))
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchArchive.mockReset()
  })
  it('should join streamed archive bytes and bound the request lifetime', async () => {
    fetchArchive.mockResolvedValue(
      new Response(
        new ReadableStream({
          start: (stream) => {
            stream.enqueue(new Uint8Array([1, 2]))
            stream.enqueue(new Uint8Array([3]))
            stream.close()
          },
        }),
      ),
    )
    expect(await downloadArchive('https://example.com/archive.gz')).toEqual(Buffer.from([1, 2, 3]))
    expect(fetchArchive).toHaveBeenCalledWith('https://example.com/archive.gz', {
      signal: expect.any(AbortSignal),
    })
  })
  it('should stop an oversized response without buffering the entire archive', async () => {
    const cancelled = vi.fn()
    fetchArchive.mockResolvedValue(
      new Response(
        new ReadableStream({
          cancel: cancelled,
          start: (stream) => stream.enqueue(new Uint8Array(67108865)),
        }),
      ),
    )
    await expect(downloadArchive('https://example.com/archive.gz')).rejects.toThrow('size limit')
    expect(cancelled).toHaveBeenCalledTimes(1)
  })
  it('should reject an interrupted response', async () => {
    fetchArchive.mockResolvedValue(
      new Response(
        new ReadableStream({
          start: (stream) => stream.error(new Error('connection interrupted')),
        }),
      ),
    )
    await expect(downloadArchive('https://example.com/archive.gz')).rejects.toThrow('interrupted')
  })
  it('should reject a successful response without an archive body', async () => {
    fetchArchive.mockResolvedValue(new Response(null, {status: 204}))
    await expect(downloadArchive('https://example.com/archive.gz')).rejects.toThrow('204')
  })
})
