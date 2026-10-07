/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/test-utils/create-deferred'
import {useCapabilityTask} from '..'

describe('useCapabilityTask', () => {
  it.each([true, false])(
    'should probe support after mount independently of task state (%s)',
    async (supported) => {
      const capability = vi.fn(() => supported)
      const task = vi.fn(async (value: number) => value * 2)
      const view = renderHook(() => {
        const controller = useCapabilityTask({capability, task})
        expect(controller.availability()).toBe('checking')
        expect(controller.state()).toEqual({status: 'idle'})
        expect(capability).not.toHaveBeenCalled()
        return controller
      })
      expect(capability).toHaveBeenCalledOnce()
      expect(view.result.availability()).toBe(supported ? 'supported' : 'unsupported')
      await expect(view.result.execute(3)).resolves.toBe(supported ? 6 : undefined)
      expect(task).toHaveBeenCalledTimes(supported ? 1 : 0)
      expect(view.result.state()).toEqual(
        supported ? {result: 6, status: 'success'} : {status: 'idle'},
      )
      view.cleanup()
    },
  )

  it('should skip execution before mount', async () => {
    const task = vi.fn(async () => 1)
    let execution: Promise<number | undefined> | undefined
    const view = renderHook(() => {
      const controller = useCapabilityTask({capability: () => true, task})
      execution = controller.execute()
      expect(task).not.toHaveBeenCalled()
      expect(controller.state()).toEqual({status: 'idle'})
      return controller
    })
    await expect(execution).resolves.toBeUndefined()
    view.cleanup()
  })

  it('should invoke immediately with arguments and preserve caller-bound receivers', async () => {
    const receiver = {
      run: vi.fn(function run(this: {value: number}, amount: number) {
        return Promise.resolve(this.value + amount)
      }),
      value: 5,
    }
    const view = renderHook(() =>
      useCapabilityTask({capability: () => true, task: receiver.run.bind(receiver)}),
    )
    const execution = view.result.execute(2)
    expect(receiver.run).toHaveBeenCalledWith(2)
    expect(receiver.run.mock.contexts[0]).toBe(receiver)
    expect(view.result.state()).toEqual({status: 'pending'})
    await expect(execution).resolves.toBe(7)
    view.cleanup()
  })

  it.each(['throw', 'reject'] as const)(
    'should expose and rethrow %s failures without changing availability',
    async (failure) => {
      const error = new Error('permission denied')
      const task = vi.fn<() => Promise<number>>(() => {
        if (failure === 'throw') {
          throw error
        }
        return Promise.reject(error)
      })
      const view = renderHook(() => useCapabilityTask({capability: () => true, task}))
      await expect(view.result.execute()).rejects.toBe(error)
      expect(view.result.state()).toEqual({error, status: 'error'})
      expect(view.result.availability()).toBe('supported')
      task.mockResolvedValueOnce(4)
      await expect(view.result.execute()).resolves.toBe(4)
      expect(view.result.state()).toEqual({result: 4, status: 'success'})
      view.cleanup()
    },
  )

  it('should share pending executions with exhaust and permit the next request after settlement', async () => {
    const deferred = createDeferred<number>()
    const task = vi.fn(() => deferred.promise)
    const view = renderHook(() =>
      useCapabilityTask({capability: () => true, concurrency: 'exhaust', task}),
    )
    const first = view.result.execute()
    expect(view.result.execute()).toBe(first)
    expect(task).toHaveBeenCalledOnce()
    deferred.resolve(8)
    await expect(first).resolves.toBe(8)
    await expect(view.result.execute()).resolves.toBe(8)
    expect(task).toHaveBeenCalledTimes(2)
    view.cleanup()
  })

  it.each(['latest', undefined] as const)(
    'should publish only the latest execution with policy %s',
    async (concurrency) => {
      const first = createDeferred<number>()
      const second = createDeferred<number>()
      const task = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const view = renderHook(() => useCapabilityTask({capability: () => true, concurrency, task}))
      const firstExecution = view.result.execute()
      const secondExecution = view.result.execute()
      second.resolve(2)
      await expect(secondExecution).resolves.toBe(2)
      first.reject(new Error('stale'))
      await expect(firstExecution).rejects.toThrow('stale')
      expect(view.result.state()).toEqual({result: 2, status: 'success'})
      view.cleanup()
    },
  )

  it.each(['resolve', 'reject'] as const)(
    'should suppress state updates after disposal but preserve %s completion',
    async (completion) => {
      const deferred = createDeferred<number>()
      const task = vi.fn(() => deferred.promise)
      const view = renderHook(() => useCapabilityTask({capability: () => true, task}))
      const execution = view.result.execute()
      view.cleanup()
      if (completion === 'resolve') {
        deferred.resolve(9)
        await expect(execution).resolves.toBe(9)
      } else {
        deferred.reject(new Error('disposed'))
        await expect(execution).rejects.toThrow('disposed')
      }
      expect(view.result.state()).toEqual({status: 'pending'})
      await expect(view.result.execute()).resolves.toBeUndefined()
      expect(task).toHaveBeenCalledOnce()
    },
  )

  it('should skip a queued mount probe when the owner is already disposed', () => {
    const capability = vi.fn(() => true)
    const controller = createRoot((dispose) => {
      const result = useCapabilityTask({capability, task: async () => 1})
      dispose()
      return result
    })
    expect(capability).not.toHaveBeenCalled()
    expect(controller.availability()).toBe('checking')
  })
})
