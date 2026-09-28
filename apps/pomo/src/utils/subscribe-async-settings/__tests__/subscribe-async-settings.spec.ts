/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'
import {subscribeAsyncSettings} from '..'

describe('subscribeAsyncSettings', () => {
  it('should retain an event update when the earlier read resolves later', async () => {
    const pending = Promise.withResolvers<number>()
    const target = new EventTarget()
    const changed = vi.fn()
    const dispose = subscribeAsyncSettings({
      eventName: 'settings',
      onChange: changed,
      onError: vi.fn(),
      parse: (value) => (typeof value === 'number' ? value : null),
      read: () => pending.promise,
      target,
    })
    target.dispatchEvent(new CustomEvent('settings', {detail: 2}))
    pending.resolve(1)
    await pending.promise
    expect(changed.mock.calls).toEqual([[2]])
    dispose()
    target.dispatchEvent(new CustomEvent('settings', {detail: 3}))
    expect(changed).toHaveBeenCalledOnce()
  })

  it('should apply the initial value when no newer event arrives', async () => {
    const pending = Promise.withResolvers<number>()
    const changed = vi.fn()
    const dispose = subscribeAsyncSettings({
      eventName: 'settings',
      onChange: changed,
      onError: vi.fn(),
      parse: (value) => (typeof value === 'number' ? value : null),
      read: () => pending.promise,
      target: new EventTarget(),
    })

    pending.resolve(1)
    await pending.promise

    expect(changed.mock.calls).toEqual([[1]])
    dispose()
  })

  it('should ignore a rejected read after an event updates the settings', async () => {
    const pending = Promise.withResolvers<number>()
    const target = new EventTarget()
    const changed = vi.fn()
    const onError = vi.fn()
    const dispose = subscribeAsyncSettings({
      eventName: 'settings',
      onChange: changed,
      onError,
      parse: (value) => (typeof value === 'number' ? value : null),
      read: () => pending.promise,
      target,
    })

    target.dispatchEvent(new CustomEvent('settings', {detail: 2}))
    const error = new Error('stale read failed')
    pending.reject(error)
    await expect(pending.promise).rejects.toBe(error)

    expect(changed.mock.calls).toEqual([[2]])
    expect(onError).not.toHaveBeenCalled()
    dispose()
  })

  it('should ignore a rejected read after disposal', async () => {
    const pending = Promise.withResolvers<number>()
    const target = new EventTarget()
    const onError = vi.fn()
    const dispose = subscribeAsyncSettings({
      eventName: 'settings',
      onChange: vi.fn(),
      onError,
      parse: (value) => (typeof value === 'number' ? value : null),
      read: () => pending.promise,
      target,
    })

    dispose()
    const error = new Error('disposed read failed')
    pending.reject(error)
    await expect(pending.promise).rejects.toBe(error)

    expect(onError).not.toHaveBeenCalled()
  })

  it('should report a rejected initial read while the subscription is current', async () => {
    const pending = Promise.withResolvers<number>()
    const onError = vi.fn()
    const dispose = subscribeAsyncSettings({
      eventName: 'settings',
      onChange: vi.fn(),
      onError,
      parse: (value) => (typeof value === 'number' ? value : null),
      read: () => pending.promise,
      target: new EventTarget(),
    })

    const error = new Error('current read failed')
    pending.reject(error)
    await expect(pending.promise).rejects.toBe(error)

    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    dispose()
  })

  it('should ignore invalid events and completions after disposal', async () => {
    const pending = Promise.withResolvers<number>()
    const target = new EventTarget()
    const changed = vi.fn()
    const dispose = subscribeAsyncSettings({
      eventName: 'settings',
      onChange: changed,
      onError: vi.fn(),
      parse: (value) => (typeof value === 'number' ? value : null),
      read: () => pending.promise,
      target,
    })
    target.dispatchEvent(new CustomEvent('settings', {detail: 'invalid'}))
    dispose()
    pending.resolve(1)
    await pending.promise
    expect(changed).not.toHaveBeenCalled()
  })
})
