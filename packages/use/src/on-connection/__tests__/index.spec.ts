import {onOffline, onOnline} from '../'

describe('on-connection', () => {
  describe('onOffline', () => {
    it('should call onOffline handle', () => {
      const myFake = jest.spyOn(window, 'addEventListener')

      const fakeHandle = jest.fn()

      onOffline(fakeHandle)

      expect(myFake.mock.calls.length).toBe(1)

      expect(myFake.mock.calls[0][0]).toBe('offline')

      const handler: any = myFake.mock.calls[0][1]

      expect(fakeHandle.mock.calls.length).toBe(0)

      handler({})

      expect(fakeHandle.mock.calls.length).toBe(1)

      myFake.mockRestore()
    })
  })
  describe('onOnline', () => {
    it('should call onOffline handle', () => {
      const myFake = jest.spyOn(window, 'addEventListener')

      const fakeHandle = jest.fn()

      onOnline(fakeHandle)

      expect(myFake.mock.calls.length).toBe(1)

      expect(myFake.mock.calls[0][0]).toBe('online')

      const handler: any = myFake.mock.calls[0][1]

      expect(fakeHandle.mock.calls.length).toBe(0)

      handler({})

      expect(fakeHandle.mock.calls.length).toBe(1)

      myFake.mockRestore()
    })
  })
})
