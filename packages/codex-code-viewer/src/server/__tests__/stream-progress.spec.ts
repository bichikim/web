import {describe, expect, it} from 'vitest'
import {streamProgress} from '../stream-progress'

describe('streamProgress', () => {
  it('should deliver pending events while production is unfinished', async () => {
    const finished = Promise.withResolvers<void>()
    const stream = streamProgress({
      run: async (receive) => {
        receive(1)
        receive(2)
        await finished.promise
        receive(3)
      },
      signal: new AbortController().signal,
    })
    expect((await stream.next()).value).toEqual([1, 2])
    finished.resolve()
    expect(await Array.fromAsync(stream)).toEqual([[3]])
  })
  it('should retain published results and propagate subsequent failure', async () => {
    const finished = Promise.withResolvers<void>()
    const stream = streamProgress({
      run: async (receive) => {
        receive(1)
        await finished.promise
        throw new Error('analysis failed')
      },
      signal: new AbortController().signal,
    })
    expect((await stream.next()).value).toEqual([1])
    finished.resolve()
    await expect(stream.next()).rejects.toThrow('analysis failed')
  })
  it('should let the producer await consumption before starting its next analysis stage', async () => {
    const stages: number[] = []
    const stream = streamProgress({
      run: async (receive) => {
        await receive(1)
        stages.push(2)
        await receive(2)
      },
      signal: new AbortController().signal,
    })
    expect((await stream.next()).value).toEqual([1])
    await Promise.resolve()
    expect(stages).toEqual([])
    expect((await stream.next()).value).toEqual([2])
    expect(stages).toEqual([2])
    expect((await stream.next()).done).toBe(true)
  })
  it('should cancel its producer when the consumer returns', async () => {
    let operation: AbortSignal | undefined
    const stopped = Promise.withResolvers<void>()
    const stream = streamProgress({
      run: async (receive, signal) => {
        operation = signal
        signal.addEventListener('abort', () => stopped.resolve(), {once: true})
        receive(1)
        await stopped.promise
      },
      signal: new AbortController().signal,
    })
    await stream.next()
    await stream.return(undefined)
    expect(operation?.aborted).toBe(true)
  })
})
