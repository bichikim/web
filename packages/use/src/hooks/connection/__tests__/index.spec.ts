/**
 * @jest-environment jsdom
 */
import {effectScope} from 'vue'
import {onEvent} from 'src/hooks/event'
import {onOffline, onOnline, useConnection} from '../'
import {afterEach, describe, expect, it, vi} from 'vitest'
vi.mock('src/hooks/event')

const _useEvent = vi.mocked(onEvent)

describe('on-connection', () => {
  describe('onOffline', () => {
    afterEach(() => {
      _useEvent.mockClear()
    })
    it('should use useEvent correctly', () => {
      const scope = effectScope()
      scope.run(() => {
        const callback = vi.fn()
        onOffline(callback)
        expect(_useEvent).toBeCalledTimes(1)
        expect(_useEvent).toBeCalledWith(window, 'offline', callback, {
          capture: false,
          passive: true,
        })
      })

      scope.stop()
    })
  })
  describe('onOnline', () => {
    afterEach(() => {
      _useEvent.mockClear()
    })
    it('should call onOffline handle', () => {
      const scope = effectScope()
      scope.run(() => {
        const callback = vi.fn()

        onOnline(callback)

        expect(_useEvent).toBeCalledTimes(1)
        expect(_useEvent).toBeCalledWith(window, 'online', callback, {
          capture: false,
          passive: true,
        })
      })
      scope.stop()
    })
  })
  describe('useConnection', () => {
    afterEach(() => {
      _useEvent.mockClear()
    })
    it('should update connection state', async () => {
      const scope = effectScope()
      scope.run(() => {
        const result = useConnection()

        expect(_useEvent).toBeCalledTimes(2)
        expect(_useEvent).toBeCalledWith(window, 'online', expect.any(Function), {
          capture: false,
          passive: true,
        })
        const triggerOnLine: any = _useEvent.mock.calls[0][2]
        expect(_useEvent).toBeCalledWith(window, 'offline', expect.any(Function), {
          capture: false,
          passive: true,
        })
        const triggerOffline: any = _useEvent.mock.calls[1][2]

        expect(result.value).toBe(true)

        triggerOnLine()
        expect(result.value).toBe(true)

        triggerOffline()
        expect(result.value).toBe(false)
      })
      scope.stop()
    })

    it('should initialize connection', () => {
      const scope = effectScope()
      scope.run(() => {
        const result = useConnection(false)

        expect(result.value).toBe(false)
      })
      scope.stop()
    })
  })
})
