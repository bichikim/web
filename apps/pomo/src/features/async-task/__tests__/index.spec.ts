import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {type AsyncTaskController, useAsyncTask} from '../index'

interface Deferred<Result> {
  readonly promise: Promise<Result>
  readonly reject: (error: unknown) => void
  readonly resolve: (result: Result) => void
}

interface AsyncTaskTestRoot<Arguments extends readonly unknown[], Result> {
  readonly controller: AsyncTaskController<Arguments, Result>
  readonly dispose: () => void
}

const createDeferred = <Result>(): Deferred<Result> => {
  let rejectPromise: (error: unknown) => void = () => undefined
  let resolvePromise: (result: Result) => void = () => undefined
  const promise = new Promise<Result>((resolve, reject) => {
    rejectPromise = reject
    resolvePromise = resolve
  })

  return {promise, reject: rejectPromise, resolve: resolvePromise}
}

const createTaskRoot = <Arguments extends readonly unknown[], Result>(
  task: (...arguments_: Arguments) => Promise<Result>,
  concurrency?: 'exhaust' | 'latest',
): AsyncTaskTestRoot<Arguments, Result> => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useAsyncTask({concurrency, task})
  })

  return {controller, dispose: disposeRoot}
}

describe('useAsyncTask', () => {
  it('should expose successful task results', async () => {
    const root = createTaskRoot(async (value: number) => value * 2)

    expect(root.controller.state()).toEqual({status: 'idle'})
    const execution = root.controller.execute(4)
    expect(root.controller.state()).toEqual({status: 'pending'})
    await expect(execution).resolves.toBe(8)
    expect(root.controller.state()).toEqual({result: 8, status: 'success'})
    root.dispose()
  })

  it('should expose task failures and preserve promise rejection', async () => {
    const taskError = new Error('작업 실패')
    const root = createTaskRoot(async () => Promise.reject(taskError))

    await expect(root.controller.execute()).rejects.toBe(taskError)
    expect(root.controller.state()).toEqual({error: taskError, status: 'error'})
    root.dispose()
  })

  it('should normalize synchronous task failures', async () => {
    const taskError = new Error('동기 작업 실패')
    const root = createTaskRoot(() => {
      throw taskError
    })

    await expect(root.controller.execute()).rejects.toBe(taskError)
    expect(root.controller.state()).toEqual({error: taskError, status: 'error'})
    root.dispose()
  })

  it('should reuse an active execution with the exhaust policy', async () => {
    const deferred = createDeferred<number>()
    const task = vi.fn(() => deferred.promise)
    const root = createTaskRoot(task, 'exhaust')

    const firstExecution = root.controller.execute()
    const secondExecution = root.controller.execute()

    expect(secondExecution).toBe(firstExecution)
    expect(task).toHaveBeenCalledTimes(1)
    deferred.resolve(7)
    await expect(firstExecution).resolves.toBe(7)
    root.dispose()
  })

  it('should only publish the latest execution state with the latest policy', async () => {
    const firstDeferred = createDeferred<string>()
    const secondDeferred = createDeferred<string>()
    const task = vi.fn((value: string) =>
      value === 'first' ? firstDeferred.promise : secondDeferred.promise,
    )
    const root = createTaskRoot(task, 'latest')

    const firstExecution = root.controller.execute('first')
    const secondExecution = root.controller.execute('second')
    secondDeferred.resolve('second result')
    await expect(secondExecution).resolves.toBe('second result')
    firstDeferred.resolve('first result')
    await expect(firstExecution).resolves.toBe('first result')

    expect(root.controller.state()).toEqual({result: 'second result', status: 'success'})
    root.dispose()
  })

  it('should use the latest policy by default', async () => {
    const firstDeferred = createDeferred<string>()
    const secondDeferred = createDeferred<string>()
    const task = vi.fn((value: string) =>
      value === 'first' ? firstDeferred.promise : secondDeferred.promise,
    )
    const root = createTaskRoot(task)

    const firstExecution = root.controller.execute('first')
    const secondExecution = root.controller.execute('second')
    firstDeferred.resolve('first result')
    await expect(firstExecution).resolves.toBe('first result')
    expect(root.controller.state()).toEqual({status: 'pending'})

    secondDeferred.resolve('second result')
    await expect(secondExecution).resolves.toBe('second result')
    expect(root.controller.state()).toEqual({result: 'second result', status: 'success'})
    root.dispose()
  })

  it('should preserve the latest success when an older execution fails', async () => {
    const firstDeferred = createDeferred<string>()
    const secondDeferred = createDeferred<string>()
    const task = vi.fn((value: string) =>
      value === 'first' ? firstDeferred.promise : secondDeferred.promise,
    )
    const root = createTaskRoot(task, 'latest')
    const staleError = new Error('오래된 실행 실패')

    const firstExecution = root.controller.execute('first')
    const secondExecution = root.controller.execute('second')
    secondDeferred.resolve('second result')
    await expect(secondExecution).resolves.toBe('second result')
    firstDeferred.reject(staleError)
    await expect(firstExecution).rejects.toBe(staleError)

    expect(root.controller.state()).toEqual({result: 'second result', status: 'success'})
    root.dispose()
  })

  it('should allow execution to retry after a failure', async () => {
    const taskError = new Error('첫 실행 실패')
    const task = vi.fn().mockRejectedValueOnce(taskError).mockResolvedValueOnce('재시도 성공')
    const root = createTaskRoot(task)

    await expect(root.controller.execute()).rejects.toBe(taskError)
    await expect(root.controller.execute()).resolves.toBe('재시도 성공')

    expect(task).toHaveBeenCalledTimes(2)
    expect(root.controller.state()).toEqual({result: '재시도 성공', status: 'success'})
    root.dispose()
  })

  it('should reset state and ignore completion from a detached execution', async () => {
    const deferred = createDeferred<number>()
    const root = createTaskRoot(() => deferred.promise)

    const execution = root.controller.execute()
    root.controller.reset()
    expect(root.controller.state()).toEqual({status: 'idle'})
    deferred.resolve(3)
    await expect(execution).resolves.toBe(3)
    expect(root.controller.state()).toEqual({status: 'idle'})
    root.dispose()
  })

  it('should ignore completion after its Solid owner is disposed', async () => {
    const deferred = createDeferred<number>()
    const root = createTaskRoot(() => deferred.promise)

    const execution = root.controller.execute()
    root.dispose()
    deferred.resolve(5)
    await expect(execution).resolves.toBe(5)

    expect(root.controller.state()).toEqual({status: 'pending'})
  })
})
