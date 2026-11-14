import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../src/player/create-empty-document'
import {createBufferEngine} from '../../src/player/buffering/create-buffer-engine'
import {createBufferSession} from '../../src/player/buffering/create-buffer-session'
import {createBufferWorker} from '../../src/player/buffering/create-buffer-worker'
import type {
  BufferRefreshCallback,
  BufferScheduler,
  BufferWorker,
  ProduceBufferFrame,
} from '../../src/player/buffering/types'

test('should recover delayed production and refill before submission with a real Worker', async () => {
  const document = createEmptyDocument()
  const state = createBufferEngine(document).step(0, new ArrayBuffer(0)).state
  const arrivals = Array.from({length: 4}, () => {
    let complete: (release: () => void) => void = () => {}
    const promise = new Promise<() => void>((resolve) => {
      complete = resolve
    })
    return {promise, resolve: complete}
  })
  const requests: ProduceBufferFrame[] = []
  const callbacks = new Map<number, BufferRefreshCallback>()
  let now = 0
  let sequence = 0
  const scheduler: BufferScheduler = {
    cancelFrame: (handle) => {
      callbacks.delete(handle)
    },
    now: () => now,
    queueMicrotask,
    requestFrame: (callback) => {
      sequence += 1
      callbacks.set(sequence, callback)
      return sequence
    },
  }
  const advance = (milliseconds: number) => {
    now += milliseconds
    const ready = [...callbacks.values()]
    callbacks.clear()
    ready.forEach((callback) => callback())
  }
  const release = async (index: number) => {
    const complete = await arrivals[index]!.promise
    complete()
    await Promise.resolve()
  }
  const submitted: number[] = []
  const failed = vi.fn()
  const session = createBufferSession({
    createWorker(onError) {
      const browser = createBufferWorker(onError)
      const worker: BufferWorker = {
        ...browser,
        produce(request) {
          const index = requests.length
          requests.push(request)
          return new Promise((resolve, reject) => {
            browser
              .produce(request)
              .then((frame) => arrivals[index]!.resolve(() => resolve(frame)), reject)
          })
        },
      }
      return worker
    },
    document,
    onError: failed,
    onFrame: () => {
      submitted.push(requests.length)
    },
    scheduler,
  })
  try {
    await session.ready
    await session.start(state)
    advance(100)
    await release(0)
    expect(requests[1]!.time).toBeCloseTo(100 + 1000 / 60, 8)
    advance(5)
    await release(1)
    expect(requests[2]!.deltaTime).toBeCloseTo(1 / 60, 10)
    await release(2)
    advance(20)
    advance(20)
    expect(submitted).toEqual([4])
    expect(failed).not.toHaveBeenCalled()
  } finally {
    session.destroy()
  }
})
