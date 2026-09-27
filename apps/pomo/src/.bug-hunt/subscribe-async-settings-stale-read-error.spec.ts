/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'

import {subscribeAsyncSettings} from '../utils/subscribe-async-settings/subscribe-async-settings'

describe('subscribeAsyncSettings stale read rejection', () => {
  it('should not call onError when the initial read rejects after a newer event value was applied', async () => {
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
    pending.reject(new Error('initial read failed'))
    await pending.promise.catch(() => undefined)

    expect(changed).toHaveBeenCalledOnce()
    expect(changed).toHaveBeenCalledWith(2)
    expect(onError).not.toHaveBeenCalled()

    dispose()
  })
})
