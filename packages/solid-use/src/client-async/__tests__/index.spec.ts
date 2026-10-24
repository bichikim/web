/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {useClientAsync} from '..'

it('should load after mounting and release the returned cleanup once', async () => {
  const pending = Promise.withResolvers<string>()
  const load = vi.fn(() => pending.promise)
  const release = vi.fn()
  const ready = vi.fn(() => release)
  const error = vi.fn()
  const dispose = createRoot((dispose) => {
    useClientAsync(load, ready, error)
    expect(load).not.toHaveBeenCalled()
    return dispose
  })

  expect(load).toHaveBeenCalledOnce()
  expect(ready).not.toHaveBeenCalled()
  pending.resolve('module')
  await pending.promise

  expect(ready).toHaveBeenCalledExactlyOnceWith('module')
  expect(release).not.toHaveBeenCalled()
  dispose()
  dispose()
  expect(release).toHaveBeenCalledOnce()
  expect(error).not.toHaveBeenCalled()
})

it.each(['resolve', 'reject'] as const)(
  'should ignore a late %s after disposal',
  async (outcome) => {
    const pending = Promise.withResolvers<string>()
    const ready = vi.fn()
    const error = vi.fn()
    const dispose = createRoot((dispose) => {
      useClientAsync(() => pending.promise, ready, error)
      return dispose
    })
    dispose()

    if (outcome === 'resolve') {
      pending.resolve('module')
    } else {
      pending.reject(new Error('late failure'))
    }
    await pending.promise.catch(() => undefined)

    expect(ready).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  },
)

it.each(['load', 'ready'] as const)('should report a synchronous %s failure', async (stage) => {
  const failure = new Error('failed')
  const error = vi.fn()
  const dispose = createRoot((dispose) => {
    useClientAsync(
      () => {
        if (stage === 'load') {
          throw failure
        }
        return Promise.resolve('module')
      },
      () => {
        throw failure
      },
      error,
    )
    return dispose
  })
  await Promise.resolve()

  expect(error).toHaveBeenCalledExactlyOnceWith(failure)
  dispose()
})

it('should report a rejected loader', async () => {
  const pending = Promise.withResolvers<string>()
  const ready = vi.fn()
  const error = vi.fn()
  const failure = new Error('load failed')
  const dispose = createRoot((dispose) => {
    useClientAsync(() => pending.promise, ready, error)
    return dispose
  })
  pending.reject(failure)
  await pending.promise.catch(() => undefined)

  expect(error).toHaveBeenCalledExactlyOnceWith(failure)
  expect(ready).not.toHaveBeenCalled()
  dispose()
})

it('should allow setup without a cleanup function', async () => {
  const ready = vi.fn()
  const error = vi.fn()
  const dispose = createRoot((dispose) => {
    useClientAsync(() => Promise.resolve('module'), ready, error)
    return dispose
  })
  await Promise.resolve()
  dispose()

  expect(ready).toHaveBeenCalledExactlyOnceWith('module')
  expect(error).not.toHaveBeenCalled()
})

it('should release setup immediately if setup itself disposes the owner', async () => {
  const release = vi.fn()
  const error = vi.fn()
  const dispose = createRoot((dispose) => {
    useClientAsync(
      () => Promise.resolve('module'),
      () => {
        dispose()
        return release
      },
      error,
    )
    return dispose
  })
  await Promise.resolve()
  dispose()

  expect(release).toHaveBeenCalledOnce()
  expect(error).not.toHaveBeenCalled()
})
