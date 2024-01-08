/**
 * @jest-environment jsdom
 */
import {mountComposition} from '@winter-love/test-utils'
import {markRaw, Ref, ref} from 'vue'
import {onElementResize} from '../'
import {isElement} from 'src/checks/is-element'

jest.mock('src/checks/is-element')

const _isElement = jest.mocked(isElement)

describe('onElementResize', () => {
  let nativeResizeObserver: any
  let watchResult

  beforeEach(() => {
    nativeResizeObserver = globalThis.ResizeObserver
    watchResult = {}

    class ResizeObserver {
      observe: jest.Mock
      disconnect: jest.Mock

      constructor(callback) {
        //
        watchResult.callback = callback
        watchResult.observe = jest.fn()
        watchResult.disconnect = jest.fn()
        this.observe = watchResult.observe
        this.disconnect = watchResult.disconnect
      }
    }

    globalThis.ResizeObserver = ResizeObserver as any
  })

  afterEach(() => {
    globalThis.ResizeObserver = nativeResizeObserver
  })

  it('should call callback when element size is changed', () => {
    _isElement.mockReturnValue(true)
    const callback = jest.fn()
    const element: HTMLElement = {
      get contentRect() {
        return {height: 300, width: 300}
      },
    } as any
    const wrapper = mountComposition(() => {
      const elementRef: Ref<HTMLElement> = ref(markRaw(element))
      onElementResize(elementRef, callback)
    })

    expect(typeof watchResult.callback).toBe('function')
    expect(watchResult.observe).toBeCalledTimes(1)
    expect(watchResult.disconnect).not.toBeCalled()

    watchResult.callback([element])
    expect(callback).toBeCalledWith({height: 300, width: 300})
    callback.mockClear()

    watchResult.callback([])
    expect(callback).toBeCalledTimes(0)

    wrapper.unmount()
    expect(watchResult.disconnect).toBeCalledTimes(1)
  })
})
