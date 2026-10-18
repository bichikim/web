import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ScanBatch} from '../../shared/contracts'
import {createTreeStreamConsumer} from '../create-tree-stream-consumer'

const batch: ScanBatch = {complete: false, directories: [], directory: '', files: []}

describe('createTreeStreamConsumer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it('should deliver the first result immediately and flush remaining directory chunks together', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
    vi.stubGlobal('requestAnimationFrame', undefined)
    const receive = vi.fn()
    const consumer = createTreeStreamConsumer({receive, signal: new AbortController().signal})
    await consumer.receive(batch)
    expect(receive).toHaveBeenCalledOnce()
    await consumer.receive({...batch, files: [{openable: true, path: 'a.ts'}]})
    await consumer.receive({
      ...batch,
      complete: true,
      files: [{openable: true, path: 'b.ts'}],
      version: '1',
    })
    expect(receive).toHaveBeenCalledOnce()
    consumer.flush()
    expect(receive).toHaveBeenLastCalledWith([
      expect.objectContaining({
        complete: true,
        files: [
          {openable: true, path: 'a.ts'},
          {openable: true, path: 'b.ts'},
        ],
        version: '1',
      }),
    ])
  })
  it('should bound the buffered entries even when reads complete within the same clock tick', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
    vi.stubGlobal('requestAnimationFrame', undefined)
    const receive = vi.fn()
    const consumer = createTreeStreamConsumer({receive, signal: new AbortController().signal})
    await consumer.receive(batch)
    await consumer.receive({
      ...batch,
      files: Array.from({length: 4096}, (_, index) => ({openable: true, path: `${index}.ts`})),
    })
    expect(receive).toHaveBeenCalledTimes(2)
  })
  it('should discard queued results when cancelled', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
    vi.stubGlobal('requestAnimationFrame', undefined)
    const controller = new AbortController()
    const receive = vi.fn()
    const consumer = createTreeStreamConsumer({receive, signal: controller.signal})
    await consumer.receive(batch)
    await consumer.receive(batch)
    controller.abort()
    consumer.flush()
    expect(receive).toHaveBeenCalledOnce()
    await expect(consumer.receive(batch)).rejects.toThrow()
  })
  it('should commit delayed input on a frame without delaying the next transport read', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0)
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const receive = vi.fn()
    const consumer = createTreeStreamConsumer({receive, signal: new AbortController().signal})
    const first = consumer.receive(batch)
    frames.shift()!(0)
    await first
    now.mockReturnValue(100)
    const consumed = vi.fn()
    const delayed = consumer.receive({...batch, complete: true}).then(consumed)
    await Promise.resolve()
    expect(consumed).toHaveBeenCalledOnce()
    expect(receive).toHaveBeenCalledOnce()
    frames.shift()!(0)
    await delayed
    expect(receive).toHaveBeenCalledTimes(2)
  })
  it('should propagate an asynchronous frame commit failure to the stream consumer', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const receive = vi.fn()
    const consumer = createTreeStreamConsumer({receive, signal: new AbortController().signal})
    const first = consumer.receive(batch)
    frames.shift()!(0)
    await first
    const error = new Error('Commit failed')
    receive.mockImplementationOnce(() => {
      throw error
    })
    await consumer.receive(batch)
    frames.shift()!(0)
    await Promise.resolve()
    await Promise.resolve()
    expect(consumer.flush).toThrow(error)
    await expect(consumer.receive(batch)).rejects.toBe(error)
  })
})
