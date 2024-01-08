/**
 * @jest-environment jsdom
 */
import {mountScope} from '@winter-love/test-utils'
import {onEvent} from 'src/hooks/event'
import {onOffline, onOnline, useConnection} from '../'

jest.mock('src/hooks/event')

const _useEvent = jest.mocked(onEvent)

describe('on-connection', () => {
  describe('onOffline', () => {
    afterEach(() => {
      _useEvent.mockClear()
    })
    it('should use useEvent correctly', () => {
      mountScope(() => {
        const callback = jest.fn()
        onOffline(callback)
        expect(_useEvent).toBeCalledTimes(1)
        expect(_useEvent).toBeCalledWith(window, 'offline', callback, {
          capture: false,
          passive: true,
        })
      }).stop()
    })
  })
  describe('onOnline', () => {
    afterEach(() => {
      _useEvent.mockClear()
    })
    it('should call onOffline handle', () => {
      mountScope(() => {
        const callback = jest.fn()

        onOnline(callback)

        expect(_useEvent).toBeCalledTimes(1)
        expect(_useEvent).toBeCalledWith(window, 'online', callback, {
          capture: false,
          passive: true,
        })
      }).stop()
    })
  })
  describe('useConnection', () => {
    afterEach(() => {
      _useEvent.mockClear()
    })
    it('should update connection state', async () => {
      mountScope(() => {
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
      }).stop()
    })

    it('should initialize connection', () => {
      mountScope(() => {
        const result = useConnection(false)

        expect(result.value).toBe(false)
      }).stop()
    })
  })
})
