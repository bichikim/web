/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'
import {subscribeAsyncSettings} from '../subscribe-async-settings'

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
