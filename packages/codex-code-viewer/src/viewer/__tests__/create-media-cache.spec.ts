import {describe, expect, it, vi} from 'vitest'
import {createMediaCache} from '../create-media-cache'

describe('createMediaCache', () => {
  const metadata = {
    mimeType: 'image/png',
    path: 'image.png',
    revision: 'first',
    session: 'session',
    size: 4,
  }
  const blob = (): Blob => new Blob(['data'], {type: 'image/png'})
  it('should reuse a completed Blob and deduplicate concurrent loads', async () => {
    const cache = createMediaCache()
    const load = vi.fn(async () => blob())
    const first = cache.acquire({...metadata, load})
    const second = cache.acquire({...metadata, load})
    expect(await first.result).toBe(await second.result)
    first.release()
    second.release()
    const next = cache.acquire({...metadata, load})
    expect(await next.result).toBe(await first.result)
    expect(load).toHaveBeenCalledOnce()
    next.release()
    cache.clear()
  })
  it('should separate revision and session identities and release stored Blobs on clear', async () => {
    const cache = createMediaCache()
    const load = vi.fn(async () => blob())
    for (const identity of [
      metadata,
      {...metadata, revision: 'edited'},
      {...metadata, session: 'other'},
    ]) {
      const lease = cache.acquire({...identity, load})
      // oxlint-disable-next-line no-await-in-loop -- Each identity is a separate completed navigation.
      await lease.result
      lease.release()
    }
    expect(load).toHaveBeenCalledTimes(3)
    cache.clear()
    const fresh = cache.acquire({...metadata, load})
    await fresh.result
    fresh.release()
    expect(load).toHaveBeenCalledTimes(4)
  })
  it('should enforce the Blob byte budget with least recently used eviction', async () => {
    const cache = createMediaCache({maxBytes: 8, maxEntries: 8})
    const load = vi.fn(async () => blob())
    for (const path of ['a.png', 'b.png', 'a.png', 'c.png', 'a.png', 'b.png']) {
      const lease = cache.acquire({...metadata, load, path})
      // oxlint-disable-next-line no-await-in-loop -- Eviction depends on completed accesses in this order.
      await lease.result
      lease.release()
    }
    expect(load).toHaveBeenCalledTimes(4)
    cache.clear()
  })
  it('should cancel a pending load only after its last consumer releases it', async () => {
    const cache = createMediaCache()
    let complete: (value: Blob) => void = () => {}
    let signal: AbortSignal | undefined
    const load = vi.fn((request: {signal: AbortSignal}) => {
      signal = request.signal
      return new Promise<Blob>((resolve) => {
        complete = resolve
      })
    })
    const first = cache.acquire({...metadata, load})
    const second = cache.acquire({...metadata, load})
    const rejected = expect(first.result).rejects.toMatchObject({name: 'AbortError'})
    await Promise.resolve()
    first.release()
    expect(signal?.aborted).toBe(false)
    second.release()
    expect(signal?.aborted).toBe(true)
    complete(blob())
    await rejected
    await expect(second.result).rejects.toMatchObject({name: 'AbortError'})
    cache.clear()
  })
  it('should discard failures and allow a subsequent attempt', async () => {
    const cache = createMediaCache()
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('transfer failed'))
      .mockResolvedValue(blob())
    const first = cache.acquire({...metadata, load})
    await expect(first.result).rejects.toThrow('transfer failed')
    first.release()
    const next = cache.acquire({...metadata, load})
    expect(await next.result).toBeInstanceOf(Blob)
    next.release()
    expect(load).toHaveBeenCalledTimes(2)
    cache.clear()
  })
})
