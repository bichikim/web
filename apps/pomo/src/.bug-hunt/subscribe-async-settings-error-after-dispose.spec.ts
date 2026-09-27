/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {subscribeAsyncSettings} from '../utils/subscribe-async-settings/subscribe-async-settings'

it('should ignore a rejected initial read after the subscription is disposed', async () => {
  const pending = Promise.withResolvers<number>()
  const target = new EventTarget()
  const onError = vi.fn()
  const unsubscribe = subscribeAsyncSettings({
    eventName: 'settings',
    onChange: vi.fn(),
    onError,
    parse: (value) => (typeof value === 'number' ? value : null),
    read: () => pending.promise,
    target,
  })

  unsubscribe()
  pending.reject(new Error('read failed'))
  await pending.promise.catch(() => undefined)

  expect(onError).not.toHaveBeenCalled()
})
