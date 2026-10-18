import {describe, expect, it, vi} from 'vitest'
import {loadDocumentSource} from '../load-document-source'
import type {CodeDocument} from '../../shared/contracts'

vi.mock('../../shared/reading-limits', () => ({MAX_TEXT_BYTES: 1000, SOURCE_CHUNK_LENGTH: 4}))

const descriptor = (length: number): CodeDocument => ({
  lineCount: 2,
  lines: [],
  location: {column: 1, line: 1, path: 'large.ts'},
  readOnly: true,
  revision: 'v1',
  source: '',
  sourceLength: length,
})
describe('loadDocumentSource', () => {
  it('should reassemble out-of-order chunks and surrogate pairs with at most four active reads', async () => {
    const source = 'abc😀\r\n0123456789xyz'
    let active = 0
    let peak = 0
    const waiting = Array.from({length: 4}, () => Promise.withResolvers<void>())
    const started = Promise.withResolvers<void>()
    const call = vi.fn(async (_name, input) => {
      active += 1
      peak = Math.max(peak, active)
      const offset = Number(input.offset)
      if (offset < 16) {
        if (active === 4) {
          started.resolve()
        }
        await waiting[offset / 4].promise
      }
      active -= 1
      const data = source.slice(offset, offset + 4)
      return {content: [], structuredContent: {data, next: offset + data.length}}
    })
    const loading = loadDocumentSource({
      document: descriptor(source.length),
      port: {call},
      session: 's',
    })
    await started.promise
    for (const index of [3, 1, 2, 0]) {
      waiting[index].resolve()
    }
    expect(await loading).toBe(source)
    expect(peak).toBe(4)
    expect(call).toHaveBeenCalledWith('code.source', {
      offset: 0,
      path: 'large.ts',
      revision: 'v1',
      session: 's',
    })
  })
  it('should stop after a replaced document drains the active batch', async () => {
    let current = true
    const call = vi.fn(async (_name, input) => {
      current = false
      return {content: [], structuredContent: {data: 'xxxx', next: Number(input.offset) + 4}}
    })
    await expect(
      loadDocumentSource({
        current: () => current,
        document: descriptor(20),
        port: {call},
        session: 's',
      }),
    ).rejects.toMatchObject({name: 'AbortError'})
    expect(call).toHaveBeenCalledTimes(4)
  })
  it('should reject truncated chunks rather than displaying partial source', async () => {
    const call = vi.fn(async () => ({content: [], structuredContent: {data: 'x', next: 1}}))
    await expect(
      loadDocumentSource({document: descriptor(8), port: {call}, session: 's'}),
    ).rejects.toThrow()
  })
  it('should propagate revision failures after draining the batch', async () => {
    const call = vi.fn(async () => ({
      content: [],
      isError: true,
      structuredContent: {code: 'stale-document'},
    }))
    await expect(
      loadDocumentSource({document: descriptor(20), port: {call}, session: 's'}),
    ).rejects.toThrow()
    expect(call).toHaveBeenCalledTimes(4)
  })
  it('should avoid requests when loading is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const call = vi.fn()
    await expect(
      loadDocumentSource({
        document: descriptor(8),
        port: {call},
        request: {signal: controller.signal},
        session: 's',
      }),
    ).rejects.toThrow()
    expect(call).not.toHaveBeenCalled()
  })
  it('should reuse completed source only for the same port, session, path and revision', async () => {
    const call = vi.fn(async (_name, input) => ({
      content: [],
      structuredContent: {data: input.revision === 'v2' ? 'def' : 'abc', next: 3},
    }))
    const port = {call}
    const document = descriptor(3)
    expect(await loadDocumentSource({document, port, session: 's'})).toBe('abc')
    expect(
      await loadDocumentSource({
        document: {...document, location: {...document.location, line: 2}},
        port,
        session: 's',
      }),
    ).toBe('abc')
    expect(call).toHaveBeenCalledTimes(1)
    expect(
      await loadDocumentSource({document: {...document, revision: 'v2'}, port, session: 's'}),
    ).toBe('def')
    await loadDocumentSource({document, port, session: 'other'})
    await loadDocumentSource({
      document: {...document, location: {...document.location, path: 'other.ts'}},
      port,
      session: 'other',
    })
    await loadDocumentSource({document, port: {call}, session: 'other'})
    expect(call).toHaveBeenCalledTimes(5)
  })
  it('should honor cancellation and replacement even when completed source is cached', async () => {
    const call = vi.fn(async () => ({content: [], structuredContent: {data: 'abc', next: 3}}))
    const port = {call}
    const document = descriptor(3)
    await loadDocumentSource({document, port, session: 's'})
    const controller = new AbortController()
    controller.abort()
    await expect(
      loadDocumentSource({document, port, request: {signal: controller.signal}, session: 's'}),
    ).rejects.toThrow()
    await expect(
      loadDocumentSource({current: () => false, document, port, session: 's'}),
    ).rejects.toMatchObject({name: 'AbortError'})
    expect(call).toHaveBeenCalledTimes(1)
  })
})
