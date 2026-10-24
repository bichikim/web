/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'
import {subscribeWebStorageChange} from '..'

describe('subscribeWebStorageChange', () => {
  it('should filter the key and storage area, include clear events, and unsubscribe', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeWebStorageChange({key: 'target', onChange})
    try {
      globalThis.dispatchEvent(new Event('storage'))
      globalThis.dispatchEvent(
        new StorageEvent('storage', {key: 'other', storageArea: localStorage}),
      )
      globalThis.dispatchEvent(
        new StorageEvent('storage', {key: 'target', storageArea: sessionStorage}),
      )
      expect(onChange).not.toHaveBeenCalled()
      globalThis.dispatchEvent(
        new StorageEvent('storage', {key: 'target', storageArea: localStorage}),
      )
      globalThis.dispatchEvent(new StorageEvent('storage', {key: null, storageArea: localStorage}))
      globalThis.dispatchEvent(new StorageEvent('storage', {key: 'target'}))
      expect(onChange.mock.calls).toEqual([['target'], [null], ['target']])
    } finally {
      unsubscribe()
    }
    globalThis.dispatchEvent(
      new StorageEvent('storage', {key: 'target', storageArea: localStorage}),
    )
    expect(onChange).toHaveBeenCalledTimes(3)
  })
  it('should preserve subscriptions that require a known local storage area', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeWebStorageChange({includeUnknownArea: false, onChange})
    try {
      globalThis.dispatchEvent(new StorageEvent('storage', {key: 'target'}))
      expect(onChange).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })
})
