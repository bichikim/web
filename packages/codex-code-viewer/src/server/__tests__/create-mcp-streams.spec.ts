import {describe, expect, it} from 'vitest'
import {createMcpStreams} from '../create-mcp-streams'

const batch = {complete: true, directories: [], directory: '', files: []}

describe('createMcpStreams', () => {
  it('should produce only demanded batches and release completed cursors', async () => {
    const streams = createMcpStreams()
    const released = Promise.withResolvers<void>()
    let produced = 0
    const url = streams.open('session', 'tree', async function* url() {
      try {
        produced += 1
        yield batch
        produced += 1
        yield batch
      } finally {
        released.resolve()
      }
    })
    expect(produced).toBe(0)
    expect(await streams.read(url)).toEqual({batch, done: false})
    expect(produced).toBe(1)
    expect(await streams.read(url)).toEqual({batch, done: false})
    expect(await streams.read(url)).toEqual({done: true})
    await released.promise
    await expect(streams.read(url)).rejects.toThrow()
  })
  it('should cancel a blocked read when its channel is replaced and leave other channels available', async () => {
    const streams = createMcpStreams()
    const started = Promise.withResolvers<void>()
    const url = streams.open('session', 'tree', async function* url(signal) {
      started.resolve()
      await new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), {once: true})
      })
      yield batch
    })
    const other = streams.open('session', 'navigation', async function* other() {
      yield batch
    })
    const reading = streams.read(url)
    const rejected = expect(reading).rejects.toThrow()
    await started.promise
    const next = streams.open('session', 'tree', async function* next() {
      yield batch
    })
    await rejected
    expect(await streams.read(next)).toEqual({batch, done: false})
    expect(await streams.read(other)).toEqual({batch, done: false})
    streams.dispose()
  })
  it('should reject overlapping reads without consuming or closing the active cursor', async () => {
    const streams = createMcpStreams()
    const ready = Promise.withResolvers<void>()
    const url = streams.open('session', 'tree', async function* url() {
      await ready.promise
      yield batch
    })
    const reading = streams.read(url)
    await expect(streams.read(url)).rejects.toThrow()
    ready.resolve()
    expect(await reading).toEqual({batch, done: false})
    streams.dispose()
  })
  it('should close failed generators and keep unrelated sessions available', async () => {
    const streams = createMcpStreams()
    const failed = streams.open('first', 'tree', async function* failed() {
      await Promise.reject(new Error('read failed'))
      yield batch
    })
    const other = streams.open('second', 'tree', async function* other() {
      yield batch
    })
    await expect(streams.read(failed)).rejects.toThrow('read failed')
    await expect(streams.read(failed)).rejects.toThrow('Scan unavailable')
    streams.closeSession('first')
    expect(await streams.read(other)).toEqual({batch, done: false})
    streams.closeSession('second')
    await expect(streams.read(other)).rejects.toThrow()
  })
})
