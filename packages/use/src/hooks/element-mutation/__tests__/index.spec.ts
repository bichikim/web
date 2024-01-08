/**
 * @jest-environment jsdom
 */
import {onElementMutation} from '../'
import {mountComposition} from '@winter-love/test-utils'
globalThis.MutationObserver = function ob() {
  // empty
} as any

describe('onElementMutation', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should call callback when the element is mutated', () => {
    const observe = jest.fn()
    const disconnect = jest.fn()
    let _callback

    jest.spyOn(globalThis, 'MutationObserver').mockImplementationOnce((callback) => {
      _callback = callback
      return {
        disconnect,
        observe,
      } as any
    })

    const callback = jest.fn()
    const fakeElement: any = {}

    const wrapper = mountComposition(() => {
      onElementMutation(fakeElement, callback)
      return {}
    })

    expect(MutationObserver).toHaveBeenCalledWith(expect.any(Function))
    expect(observe).toHaveBeenCalledWith(fakeElement, {attributes: true})
    expect(disconnect).toHaveBeenCalledTimes(0)
    expect(callback).toHaveBeenCalledTimes(0)
    _callback()
    expect(callback).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledTimes(1)
  })
  it('should do nothing if element is not element', () => {
    const observe = jest.fn()
    const disconnect = jest.fn()
    jest.spyOn(globalThis, 'MutationObserver').mockReturnValueOnce({
      disconnect,
      observe,
    } as any)
    const callback = jest.fn()
    const wrapper = mountComposition(() => {
      onElementMutation(undefined, callback)
      return {}
    })
    expect(observe).toHaveBeenCalledTimes(0)
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledTimes(0)
  })
})
