/**
 * @jest-environment jsdom
 */
import {defineComponent} from 'vue'
import {onElementMutation} from '../'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
globalThis.MutationObserver = function ob() {
  // empty
} as any

describe('onElementMutation', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })
  it('should call callback when the element is mutated', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    let _callback

    vi.spyOn(globalThis, 'MutationObserver').mockImplementationOnce((callback) => {
      _callback = callback
      return {
        disconnect,
        observe,
      } as any
    })

    const callback = vi.fn()
    const fakeElement: any = {}

    const wrapper = mount(
      defineComponent({
        setup: () => {
          onElementMutation(fakeElement, callback)
          return {}
        },
      }),
    )

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
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.spyOn(globalThis, 'MutationObserver').mockReturnValueOnce({
      disconnect,
      observe,
    } as any)
    const callback = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup: () => {
          onElementMutation(undefined, callback)
          return {}
        },
      }),
    )
    expect(observe).toHaveBeenCalledTimes(0)
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledTimes(0)
  })
})
