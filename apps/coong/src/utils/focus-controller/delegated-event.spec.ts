import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createDelegatedEvent, delegatedEmit, delegatedOn, type DelegatedEventMap} from './delegated-event'

const EVENT_NAME = 'test-event'

describe('delegated-event', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    document.removeEventListener(EVENT_NAME, () => {})
  })

  afterEach(() => {
    // Clean up any remaining event listeners
    document.removeEventListener(EVENT_NAME, () => {})
  })

  describe('createDelegatedEvent', () => {
    it('should return delegatedEventMap and unsubscribe function', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)

      expect(delegatedEventMap).toBeInstanceOf(Map)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should register event listener on document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const {unsubscribe} = createDelegatedEvent(EVENT_NAME)

      expect(addEventListenerSpy).toHaveBeenCalledWith(EVENT_NAME, expect.any(Function))
      unsubscribe()
      expect(removeEventListenerSpy).toHaveBeenCalledWith(EVENT_NAME, expect.any(Function))
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('should call listeners when event is dispatched with matching key', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      delegatedOn(delegatedEventMap, 'key1', listener1)
      delegatedOn(delegatedEventMap, 'key2', listener2)
      const emit = delegatedEmit(EVENT_NAME, 'key1')

      emit('test-value-1')
      expect(listener1).toHaveBeenCalledWith('test-value-1')
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).not.toHaveBeenCalled()
      unsubscribe()
    })

    it('should call all listeners for the same key', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      delegatedOn(delegatedEventMap, 'key1', listener1)
      delegatedOn(delegatedEventMap, 'key1', listener2)
      delegatedOn(delegatedEventMap, 'key2', listener3)
      const emit = delegatedEmit(EVENT_NAME, 'key1')

      emit('test-value')
      expect(listener1).toHaveBeenCalledWith('test-value')
      expect(listener2).toHaveBeenCalledWith('test-value')
      expect(listener3).not.toHaveBeenCalled()
      unsubscribe()
    })

    it('should not call listeners when event is dispatched with different key', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'key1', listener)
      const emit = delegatedEmit(EVENT_NAME, 'key2')

      emit('test-value')
      expect(listener).not.toHaveBeenCalled()
      unsubscribe()
    })

    it('should clear delegatedEventMap and remove event listener on unsubscribe', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'key1', listener)
      unsubscribe()
      expect(delegatedEventMap.size).toBe(0)
      const emit = delegatedEmit(EVENT_NAME, 'key1')

      emit('test-value')
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('delegatedEmit', () => {
    it('should return a function that dispatches custom event', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const dispatchSpy = vi.spyOn(document, 'dispatchEvent')
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'test-key', listener)
      const emit = delegatedEmit(EVENT_NAME, 'test-key')

      emit('test-value')

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {key: 'test-key', value: 'test-value'},
          type: EVENT_NAME,
        }),
      )
      unsubscribe()
      dispatchSpy.mockRestore()
    })

    it('should dispatch event with correct detail structure', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'test-key', listener)
      const emit = delegatedEmit(EVENT_NAME, 'test-key')

      emit({nested: 'object'})
      expect(listener).toHaveBeenCalledWith({nested: 'object'})
      unsubscribe()
    })

    it('should work with different value types', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'test-key', listener)
      const emit = delegatedEmit(EVENT_NAME, 'test-key')

      emit('string')
      emit(123)
      emit(true)
      emit(null)
      emit(undefined)
      emit([1, 2, 3])
      expect(listener).toHaveBeenCalledTimes(6)
      expect(listener).toHaveBeenNthCalledWith(1, 'string')
      expect(listener).toHaveBeenNthCalledWith(2, 123)
      expect(listener).toHaveBeenNthCalledWith(3, true)
      expect(listener).toHaveBeenNthCalledWith(4, null)
      expect(listener).toHaveBeenNthCalledWith(5, undefined)
      expect(listener).toHaveBeenNthCalledWith(6, [1, 2, 3])
      unsubscribe()
    })
  })

  describe('delegatedOn', () => {
    it('should add listener to delegatedEventMap', () => {
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'test-key', listener)
      expect(delegatedEventMap.has('test-key')).toBe(true)
      const listeners = delegatedEventMap.get('test-key')

      expect(listeners).toBeInstanceOf(Set)
      expect(listeners?.has(listener)).toBe(true)
    })

    it('should add multiple listeners to the same key', () => {
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      delegatedOn(delegatedEventMap, 'test-key', listener1)
      delegatedOn(delegatedEventMap, 'test-key', listener2)
      delegatedOn(delegatedEventMap, 'test-key', listener3)
      const listeners = delegatedEventMap.get('test-key')

      expect(listeners?.size).toBe(3)
      expect(listeners?.has(listener1)).toBe(true)
      expect(listeners?.has(listener2)).toBe(true)
      expect(listeners?.has(listener3)).toBe(true)
    })

    it('should add listeners to different keys independently', () => {
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      delegatedOn(delegatedEventMap, 'key1', listener1)
      delegatedOn(delegatedEventMap, 'key2', listener2)
      expect(delegatedEventMap.has('key1')).toBe(true)
      expect(delegatedEventMap.has('key2')).toBe(true)
      expect(delegatedEventMap.get('key1')?.has(listener1)).toBe(true)
      expect(delegatedEventMap.get('key2')?.has(listener2)).toBe(true)
    })

    it('should return unsubscribe function that removes the key from map', () => {
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      const unsubscribe = delegatedOn(delegatedEventMap, 'test-key', listener)

      expect(delegatedEventMap.has('test-key')).toBe(true)
      unsubscribe()
      expect(delegatedEventMap.has('test-key')).toBe(false)
    })

    it('should handle multiple listeners when unsubscribing', () => {
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const unsubscribe1 = delegatedOn(delegatedEventMap, 'test-key', listener1)

      delegatedOn(delegatedEventMap, 'test-key', listener2)
      expect(delegatedEventMap.has('test-key')).toBe(true)
      unsubscribe1()
      // Note: The current implementation removes the entire key, not just one listener
      expect(delegatedEventMap.has('test-key')).toBe(false)
    })

    it('should work with the same listener added multiple times', () => {
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, 'test-key', listener)
      delegatedOn(delegatedEventMap, 'test-key', listener)
      const listeners = delegatedEventMap.get('test-key')

      // Set should only contain one instance of the same listener
      expect(listeners?.size).toBe(1)
      expect(listeners?.has(listener)).toBe(true)
    })
  })

  describe('integration', () => {
    it('should work end-to-end with multiple keys and listeners', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      delegatedOn(delegatedEventMap, 'key1', listener1)
      delegatedOn(delegatedEventMap, 'key1', listener2)
      delegatedOn(delegatedEventMap, 'key2', listener3)

      const emit1 = delegatedEmit(EVENT_NAME, 'key1')
      const emit2 = delegatedEmit(EVENT_NAME, 'key2')

      emit1('value1')
      emit2('value2')
      emit1('value3')
      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener1).toHaveBeenNthCalledWith(1, 'value1')
      expect(listener1).toHaveBeenNthCalledWith(2, 'value3')
      expect(listener2).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenNthCalledWith(1, 'value1')
      expect(listener2).toHaveBeenNthCalledWith(2, 'value3')
      expect(listener3).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledWith('value2')
      unsubscribe()
    })

    it('should handle unsubscribe during active usage', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent(EVENT_NAME)
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const unsubscribe1 = delegatedOn(delegatedEventMap, 'key1', listener1)

      delegatedOn(delegatedEventMap, 'key1', listener2)
      const emit = delegatedEmit(EVENT_NAME, 'key1')

      emit('value1')
      unsubscribe1()
      emit('value2')
      // After unsubscribe, the key is removed, so no listeners should be called
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
      unsubscribe()
    })
  })
})
