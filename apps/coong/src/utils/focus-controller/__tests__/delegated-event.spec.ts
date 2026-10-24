import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  addListener,
  createDelegatedEvent,
  DEFAULT_CHANNEL_PREFIX,
  delegatedEmit,
  delegatedEmitHandler,
  type DelegatedEventMap,
  delegatedOn,
} from '../delegated-event'

const CHANNEL_NAME = 'test-event'

describe('delegated-event', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    document.removeEventListener(CHANNEL_NAME, () => {
      // empty
    })
  })

  afterEach(() => {
    // Clean up any remaining event listeners
    document.removeEventListener(CHANNEL_NAME, () => {
      // empty
    })
  })

  describe('createDelegatedEvent', () => {
    it('should return delegatedEventMap and unsubscribe function', () => {
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()

      expect(delegatedEventMap).toBeInstanceOf(Map)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should unsubscribe from all listeners when unsubscribe is called', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
      const listener = vi.fn()

      addListener(delegatedEventMap, CHANNEL_NAME, keyName, listener)
      unsubscribe()
      document.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('addListener', () => {
    it('should add keyMap to delegatedEventMap', () => {
      const keyName = 'test-key'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      addListener(delegatedEventMap, CHANNEL_NAME, keyName, listener)
      expect(delegatedEventMap.has(CHANNEL_NAME)).toBe(true)
      const delegatedPayload = delegatedEventMap.get(CHANNEL_NAME)

      expect(delegatedPayload?.keyMap).toBeInstanceOf(Map)
      expect(delegatedPayload?.delegatedListener).toBeInstanceOf(Function)
      expect(delegatedPayload?.unsubscribe).toBeInstanceOf(Function)
      expect(delegatedPayload?.keyMap.get(keyName)?.has(listener)).toBe(true)
    })

    it('should register delegatedListener to the event channel name', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      addListener(delegatedEventMap, CHANNEL_NAME, keyName, listener)
      document.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).toHaveBeenCalledWith(eventValue)
    })

    it('should register separate event listeners for different channels', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listenerA = vi.fn()
      const listenerB = vi.fn()
      const CHANNEL_A = 'channel-a'
      const CHANNEL_B = 'channel-b'

      addListener(delegatedEventMap, CHANNEL_A, keyName, listenerA)
      addListener(delegatedEventMap, CHANNEL_B, keyName, listenerB)
      // Emit event for channel-a only listenerA should be called
      document.dispatchEvent(
        new CustomEvent(CHANNEL_A, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listenerA).toHaveBeenCalledWith(eventValue)
      expect(listenerB).not.toHaveBeenCalled()
      // Emit event for channel-b only listenerB should be called
      document.dispatchEvent(
        new CustomEvent(CHANNEL_B, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listenerB).toHaveBeenCalledWith(eventValue)
    })

    it('should channel 은 같고 event key 가 다르면 이벤트 리스너는 공유 하지만 대상 key 에만 이벤트 발생 합니다 ', () => {
      const keyName1 = 'test-key-1'
      const keyName2 = 'test-key-2'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      addListener(delegatedEventMap, CHANNEL_NAME, keyName1, listener1)
      addListener(delegatedEventMap, CHANNEL_NAME, keyName2, listener2)
      document.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName1, value: eventValue}}),
      )
      expect(listener1).toHaveBeenCalledWith(eventValue)
      expect(listener2).not.toHaveBeenCalled()
      document.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName2, value: eventValue}}),
      )
      expect(listener2).toHaveBeenCalledWith(eventValue)
      expect(listener1).toHaveBeenCalledTimes(1)
    })

    it('should register event listener to custom target when target is provided', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()
      const customTarget = document.createElement('div')
      const addEventListenerSpy = vi.spyOn(customTarget, 'addEventListener')

      addListener(delegatedEventMap, CHANNEL_NAME, keyName, listener, () => customTarget)
      expect(addEventListenerSpy).toHaveBeenCalledWith(CHANNEL_NAME, expect.any(Function))
      customTarget.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).toHaveBeenCalledWith(eventValue)
      addEventListenerSpy.mockRestore()
    })

    it('should not register event listener to document when custom target is provided', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()
      const customTarget = document.createElement('div')
      const documentAddEventListenerSpy = vi.spyOn(document, 'addEventListener')

      addListener(delegatedEventMap, CHANNEL_NAME, keyName, listener, () => customTarget)
      expect(documentAddEventListenerSpy).not.toHaveBeenCalled()
      document.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).not.toHaveBeenCalled()
      documentAddEventListenerSpy.mockRestore()
    })

    it('should remove event listener from custom target when unsubscribe is called', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()
      const customTarget = document.createElement('div')
      const removeEventListenerSpy = vi.spyOn(customTarget, 'removeEventListener')

      addListener(delegatedEventMap, CHANNEL_NAME, keyName, listener, () => customTarget)
      const delegatedPayload = delegatedEventMap.get(CHANNEL_NAME)

      delegatedPayload?.unsubscribe()
      expect(removeEventListenerSpy).toHaveBeenCalledWith(CHANNEL_NAME, expect.any(Function))
      customTarget.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).not.toHaveBeenCalled()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('delegatedEmit', () => {
    it('should return a function that dispatches custom event', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
      const dispatchSpy = vi.spyOn(document, 'dispatchEvent')
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName, listener)
      delegatedEmit(CHANNEL_NAME, keyName, eventValue)

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {key: keyName, value: eventValue},
          type: CHANNEL_NAME,
        }),
      )
      unsubscribe()
      dispatchSpy.mockRestore()
    })

    it('should dispatch event with correct detail structure', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
      const listener = vi.fn()

      const {addListener} = delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName, listener)

      addListener()
      delegatedEmit(CHANNEL_NAME, keyName, eventValue)
      expect(listener).toHaveBeenCalledWith(eventValue)
      unsubscribe()
    })

    it('should work with different value types', () => {
      const keyName = 'test-key'
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
      const listener = vi.fn()

      delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName, listener).addListener()
      const emit = delegatedEmitHandler(CHANNEL_NAME, 'test-key')

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
    it('should call addListener function when addListener is called', () => {
      const keyName = 'test-key'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      const {addListener} = delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName, listener)

      addListener()
      expect(delegatedEventMap.get(CHANNEL_NAME)?.keyMap.get(keyName)?.has(listener)).toBe(true)
    })

    it('should call unsubscribe function when unsubscribe is called', () => {
      const keyName = 'test-key'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()

      const {removeListener, addListener} = delegatedOn(
        delegatedEventMap,
        CHANNEL_NAME,
        keyName,
        listener,
      )

      addListener()
      removeListener()
      expect(delegatedEventMap.get(CHANNEL_NAME)?.keyMap.get(keyName)?.has(listener)).toBe(false)
    })

    it('should register event listener to custom target when target is provided', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()
      const customTarget = document.createElement('div')
      const addEventListenerSpy = vi.spyOn(customTarget, 'addEventListener')

      const {addListener} = delegatedOn(
        delegatedEventMap,
        CHANNEL_NAME,
        keyName,
        listener,
        () => customTarget,
      )

      addListener()
      expect(addEventListenerSpy).toHaveBeenCalledWith(CHANNEL_NAME, expect.any(Function))
      customTarget.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).toHaveBeenCalledWith(eventValue)
      addEventListenerSpy.mockRestore()
    })

    it('should remove event listener from custom target when unsubscribe is called', () => {
      const keyName = 'test-key'
      const eventValue = 'test-value'
      const delegatedEventMap: DelegatedEventMap = new Map()
      const listener = vi.fn()
      const customTarget = document.createElement('div')
      const removeEventListenerSpy = vi.spyOn(customTarget, 'removeEventListener')

      const {addListener} = delegatedOn(
        delegatedEventMap,
        CHANNEL_NAME,
        keyName,
        listener,
        () => customTarget,
      )

      addListener()
      const delegatedPayload = delegatedEventMap.get(CHANNEL_NAME)

      delegatedPayload?.unsubscribe()
      expect(removeEventListenerSpy).toHaveBeenCalledWith(CHANNEL_NAME, expect.any(Function))
      customTarget.dispatchEvent(
        new CustomEvent(CHANNEL_NAME, {detail: {key: keyName, value: eventValue}}),
      )
      expect(listener).not.toHaveBeenCalled()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('integration', () => {
    it('should work end-to-end with multiple keys and listeners', () => {
      const keyName1 = 'test-key-1'
      const keyName2 = 'test-key-2'
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const listener3 = vi.fn()

      delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName1, listener1).addListener()
      delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName1, listener2).addListener()
      delegatedOn(delegatedEventMap, CHANNEL_NAME, keyName2, listener3).addListener()

      const emit1 = delegatedEmitHandler(CHANNEL_NAME, keyName1)
      const emit2 = delegatedEmitHandler(CHANNEL_NAME, keyName2)

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
      const keyName1 = 'test-key-1'
      const keyName2 = 'test-key-2'
      const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const {removeListener: removeListener1, addListener: addListener1} = delegatedOn(
        delegatedEventMap,
        CHANNEL_NAME,
        keyName1,
        listener1,
      )
      const {addListener: addListener2} = delegatedOn(
        delegatedEventMap,
        CHANNEL_NAME,
        keyName2,
        listener2,
      )

      addListener1()
      addListener2()
      const emit = delegatedEmitHandler(CHANNEL_NAME, keyName1)

      emit('value1')
      // After unsubscribe, the key is removed, so no listeners should be called
      expect(listener1).toHaveBeenCalledTimes(1)
      removeListener1()
      emit('value2')
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).not.toHaveBeenCalled()
      unsubscribe()
    })
  })
})
