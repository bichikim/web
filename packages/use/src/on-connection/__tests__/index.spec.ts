import sinon, {SinonSpy} from 'sinon'
import {onOffline, onOnline} from '../'

describe('on-connection', () => {
  describe('onOffline', () => {
    it('should call onOffline handle', () => {
      const myFake: SinonSpy = sinon.replace(window, 'addEventListener', sinon.fake()) as any

      const fakeHandle = sinon.fake()

      onOffline(fakeHandle)

      expect(myFake.callCount).toBe(1)

      expect(myFake.lastCall.firstArg).toBe('offline')

      const handler = myFake.lastCall.args[1]

      expect(fakeHandle.callCount).toBe(0)

      handler({})

      expect(fakeHandle.callCount).toBe(1)

      sinon.restore()
    })
  })
  describe('onOnline', () => {
    it('should call onOffline handle', () => {
      const myFake: SinonSpy = sinon.replace(window, 'addEventListener', sinon.fake()) as any

      const fakeHandle = sinon.fake()

      onOnline(fakeHandle)

      expect(myFake.callCount).toBe(1)

      expect(myFake.lastCall.firstArg).toBe('online')

      const handler = myFake.lastCall.args[1]

      expect(fakeHandle.callCount).toBe(0)

      handler({})

      expect(fakeHandle.callCount).toBe(1)

      sinon.restore()
    })
  })
})
