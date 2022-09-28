/**
 * @jest-environment jsdom
 */
import {onOffline, onOnline, useConnection} from '../'
import {flushPromises} from '@vue/test-utils'
import {effectScope} from 'vue'

describe('on-connection', () => {
  describe('onOffline', () => {
    it('should call onOffline handle', () => {
      const scope = effectScope()
      scope.run(() => {
        const spy = jest.spyOn(window, 'addEventListener')

        const fakeHandle = jest.fn()

        onOffline(fakeHandle)

        expect(spy.mock.calls.length).toBe(1)

        expect(spy.mock.calls[0][0]).toBe('offline')

        const handler: any = spy.mock.calls[0][1]

        expect(fakeHandle.mock.calls.length).toBe(0)

        handler({})

        expect(fakeHandle.mock.calls.length).toBe(1)

        spy.mockRestore()
      })
      scope.stop()
    })
  })
  describe('onOnline', () => {
    it('should call onOffline handle', () => {
      const scope = effectScope()
      scope.run(() => {
        const spy = jest.spyOn(window, 'addEventListener')

        const fakeHandle = jest.fn()

        onOnline(fakeHandle)

        expect(spy.mock.calls.length).toBe(1)

        expect(spy.mock.calls[0][0]).toBe('online')

        const handler: any = spy.mock.calls[0][1]

        expect(fakeHandle.mock.calls.length).toBe(0)

        handler({})

        expect(fakeHandle.mock.calls.length).toBe(1)

        spy.mockRestore()
      })
      scope.stop()
    })
  })
  describe('useConnection', () => {
    it('should change connection state', async () => {
      const scope = effectScope()
      const spy = jest.spyOn(window, 'addEventListener')
      const result = scope.run(() => {
        return useConnection()
      })

      expect(spy.mock.calls.length).toBe(2)

      expect(spy.mock.calls[0][0]).toBe('online')
      expect(spy.mock.calls[1][0]).toBe('offline')
      expect(result.value).toBe(true)

      const onlineHandler: any = spy.mock.calls[0][1]
      const offlineHandler: any = spy.mock.calls[1][1]

      offlineHandler()
      await flushPromises()
      expect(result.value).toBe(false)

      onlineHandler()
      await flushPromises()
      expect(result.value).toBe(true)

      spy.mockRestore()
      scope.stop()
    })
  })
})
