/**
 * @jest-environment jsdom
 */

import {onOffline, onOnline, useConnection} from '../'
import {flushPromises} from '@vue/test-utils'

describe('on-connection', () => {
  describe('onOffline', () => {
    it('should call onOffline handle', () => {
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
  })
  describe('onOnline', () => {
    it('should call onOffline handle', () => {
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
  })
  describe('useConnection', () => {
    it('should change connection state', async () => {
      const spy = jest.spyOn(window, 'addEventListener')
      const result = useConnection()
      expect(spy.mock.calls.length).toBe(2)

      expect(spy.mock.calls[0][0]).toBe('online')
      expect(spy.mock.calls[1][0]).toBe('offline')
      expect(result.value).toBe(true)

      const offlineHandler: any = spy.mock.calls[0][1]
      const onlineHandler: any = spy.mock.calls[1][1]

      offlineHandler()
      await flushPromises()
      expect(result.value).toBe(true)

      onlineHandler()
      await flushPromises()
      expect(result.value).toBe(false)

      spy.mockRestore()
    })
  })
})
