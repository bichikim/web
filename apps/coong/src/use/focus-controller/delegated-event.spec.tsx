/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@solidjs/testing-library'
import {
  createDelegatedEvent,
  DelegatedEventContext,
  useDelegatedEmit,
  useDelegatedOn,
} from './delegated-event'
import type {DelegatedEventMap} from 'src/utils/focus-controller/delegated-event'

// Mock the utility functions
vi.mock('src/utils/focus-controller/delegated-event', () => ({
  createDelegatedEvent: vi.fn(),
  delegatedEmit: vi.fn(),
  delegatedOn: vi.fn(),
}))

import {
  createDelegatedEvent as createDelegatedEventUtil,
  delegatedEmit as delegatedEmitUtil,
  delegatedOn as delegatedOnUtil,
} from 'src/utils/focus-controller/delegated-event'

describe('use/focus-controller/delegated-event', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('DelegatedEventContext', () => {
    it('should have default values', () => {
      const context = DelegatedEventContext.defaultValue

      expect(context.delegatedEventMap).toBeInstanceOf(Map)
      expect(context.eventName).toBe('delegated-event')
    })
  })

  describe('createDelegatedEvent', () => {
    it('should call createDelegatedEventUtil with eventName', () => {
      const eventName = 'test-event'
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockUnsubscribe = vi.fn()

      vi.mocked(createDelegatedEventUtil).mockReturnValue({
        delegatedEventMap: mockDelegatedEventMap,
        unsubscribe: mockUnsubscribe,
      })

      const {result, cleanup} = renderHook(() => createDelegatedEvent(eventName))

      expect(createDelegatedEventUtil).toHaveBeenCalledWith(eventName)
      expect(createDelegatedEventUtil).toHaveBeenCalledTimes(1)
      expect(result).toBe(mockDelegatedEventMap)
      cleanup()
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })

    it('should call unsubscribe on cleanup', () => {
      const eventName = 'test-event'
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockUnsubscribe = vi.fn()

      vi.mocked(createDelegatedEventUtil).mockReturnValue({
        delegatedEventMap: mockDelegatedEventMap,
        unsubscribe: mockUnsubscribe,
      })

      const {cleanup} = renderHook(() => createDelegatedEvent(eventName))

      expect(mockUnsubscribe).not.toHaveBeenCalled()
      cleanup()
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    })

    it('should return delegatedEventMap from utility function', () => {
      const eventName = 'custom-event'
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockUnsubscribe = vi.fn()

      vi.mocked(createDelegatedEventUtil).mockReturnValue({
        delegatedEventMap: mockDelegatedEventMap,
        unsubscribe: mockUnsubscribe,
      })

      const {result, cleanup} = renderHook(() => createDelegatedEvent(eventName))

      expect(result).toBe(mockDelegatedEventMap)
      cleanup()
    })
  })

  describe('useDelegatedEmit', () => {
    it('should call delegatedEmitUtil with eventName from context and key', () => {
      const eventName = 'context-event'
      const key = 'test-key'
      const mockEmit = vi.fn()
      const mockDelegatedEventMap = new Map() as DelegatedEventMap

      vi.mocked(delegatedEmitUtil).mockReturnValue(mockEmit)

      const {result, cleanup} = renderHook(
        () => useDelegatedEmit(key),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      expect(delegatedEmitUtil).toHaveBeenCalledWith(eventName, key)
      expect(delegatedEmitUtil).toHaveBeenCalledTimes(1)
      expect(result).toBe(mockEmit)
      cleanup()
    })

    it('should use default eventName when context is not provided', () => {
      const key = 'test-key'
      const mockEmit = vi.fn()

      vi.mocked(delegatedEmitUtil).mockReturnValue(mockEmit)

      const {result, cleanup} = renderHook(() => useDelegatedEmit(key))

      expect(delegatedEmitUtil).toHaveBeenCalledWith('delegated-event', key)
      expect(result).toBe(mockEmit)
      cleanup()
    })

    it('should work with different keys', () => {
      const eventName = 'test-event'
      const key1 = 'key1'
      const key2 = 'key2'
      const mockEmit1 = vi.fn()
      const mockEmit2 = vi.fn()
      const mockDelegatedEventMap = new Map() as DelegatedEventMap

      vi.mocked(delegatedEmitUtil).mockReturnValueOnce(mockEmit1).mockReturnValueOnce(mockEmit2)

      const {result: result1, cleanup: cleanup1} = renderHook(
        () => useDelegatedEmit(key1),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      const {result: result2, cleanup: cleanup2} = renderHook(
        () => useDelegatedEmit(key2),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      expect(delegatedEmitUtil).toHaveBeenCalledWith(eventName, key1)
      expect(delegatedEmitUtil).toHaveBeenCalledWith(eventName, key2)
      expect(result1).toBe(mockEmit1)
      expect(result2).toBe(mockEmit2)
      cleanup1()
      cleanup2()
    })
  })

  describe('useDelegatedOn', () => {
    it('should call delegatedOnUtil with delegatedEventMap from context, key, and listener', () => {
      const eventName = 'test-event'
      const key = 'test-key'
      const listener = vi.fn()
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockUnsubscribe = vi.fn()

      vi.mocked(delegatedOnUtil).mockReturnValue(mockUnsubscribe)

      const {result, cleanup} = renderHook(
        () => useDelegatedOn(key, listener),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      expect(delegatedOnUtil).toHaveBeenCalledWith(mockDelegatedEventMap, key, listener)
      expect(delegatedOnUtil).toHaveBeenCalledTimes(1)
      expect(result).toBe(mockUnsubscribe)
      cleanup()
    })

    it('should use default delegatedEventMap when context is not provided', () => {
      const key = 'test-key'
      const listener = vi.fn()
      const mockUnsubscribe = vi.fn()

      vi.mocked(delegatedOnUtil).mockReturnValue(mockUnsubscribe)

      const {result, cleanup} = renderHook(() => useDelegatedOn(key, listener))

      expect(delegatedOnUtil).toHaveBeenCalledWith(
        DelegatedEventContext.defaultValue.delegatedEventMap,
        key,
        listener,
      )
      expect(result).toBe(mockUnsubscribe)
      cleanup()
    })

    it('should work with different keys and listeners', () => {
      const eventName = 'test-event'
      const key1 = 'key1'
      const key2 = 'key2'
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockUnsubscribe1 = vi.fn()
      const mockUnsubscribe2 = vi.fn()

      vi.mocked(delegatedOnUtil)
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2)

      const {result: result1, cleanup: cleanup1} = renderHook(
        () => useDelegatedOn(key1, listener1),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      const {result: result2, cleanup: cleanup2} = renderHook(
        () => useDelegatedOn(key2, listener2),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      expect(delegatedOnUtil).toHaveBeenCalledWith(mockDelegatedEventMap, key1, listener1)
      expect(delegatedOnUtil).toHaveBeenCalledWith(mockDelegatedEventMap, key2, listener2)
      expect(result1).toBe(mockUnsubscribe1)
      expect(result2).toBe(mockUnsubscribe2)
      cleanup1()
      cleanup2()
    })

    it('should return unsubscribe function from delegatedOnUtil', () => {
      const eventName = 'test-event'
      const key = 'test-key'
      const listener = vi.fn()
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockUnsubscribe = vi.fn()

      vi.mocked(delegatedOnUtil).mockReturnValue(mockUnsubscribe)

      const {result, cleanup} = renderHook(
        () => useDelegatedOn(key, listener),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      expect(result).toBe(mockUnsubscribe)
      expect(typeof result).toBe('function')
      cleanup()
    })
  })

  describe('integration', () => {
    it('should work together with context provider', () => {
      const eventName = 'integration-event'
      const key = 'integration-key'
      const listener = vi.fn()
      const mockDelegatedEventMap = new Map() as DelegatedEventMap
      const mockEmit = vi.fn()
      const mockOnUnsubscribe = vi.fn()

      vi.mocked(delegatedEmitUtil).mockReturnValue(mockEmit)
      vi.mocked(delegatedOnUtil).mockReturnValue(mockOnUnsubscribe)

      const {result: emitResult, cleanup: emitCleanup} = renderHook(
        () => useDelegatedEmit(key),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      const {result: onResult, cleanup: onCleanup} = renderHook(
        () => useDelegatedOn(key, listener),
        {
          wrapper: (props) => (
            <DelegatedEventContext.Provider
              value={{
                delegatedEventMap: mockDelegatedEventMap,
                eventName,
              }}
            >
              {props.children}
            </DelegatedEventContext.Provider>
          ),
        },
      )

      expect(delegatedEmitUtil).toHaveBeenCalledWith(eventName, key)
      expect(delegatedOnUtil).toHaveBeenCalledWith(mockDelegatedEventMap, key, listener)
      expect(emitResult).toBe(mockEmit)
      expect(onResult).toBe(mockOnUnsubscribe)
      emitCleanup()
      onCleanup()
    })
  })
})

