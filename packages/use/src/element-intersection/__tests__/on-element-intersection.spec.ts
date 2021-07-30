import {defineComponent, h, ref} from 'vue-demi'
import {flushPromises, mount} from '@vue/test-utils'
import {onElementIntersection} from '../on-element-intersection'
const threshold = 0.05
const TestComponent = defineComponent((props, {slots}) => {
  const elementRef = ref()
  const showRef = ref()

  onElementIntersection(elementRef, (entries) => {
    const shouldClose = entries.some((entry) => {
      return entry.intersectionRatio < threshold
    })

    if (shouldClose) {
      showRef.value = false
      return
    }

    const shouldShow = entries.some((entry) => {
      return entry.intersectionRatio >= threshold
    })

    if (shouldShow) {
      showRef.value = true
    }

    return () => (
      h('div', {
        ref: elementRef,
        style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
      }, showRef.value ? slots.default?.() : undefined)
    )
  }, {
    threshold,
  })

  return () => (
    h('div', {
      ref: elementRef,
      style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
    }, showRef.value ? slots.default?.() : undefined)
  )
})

describe('on-element-intersection', () => {
  it('should show or hide element', async () => {
    const disconnect = jest.fn()
    const observe = jest.fn()
    const observerMock = jest.fn((handle, options) => {
      expect(typeof handle).toBe('function')
      expect(options).toEqual({
        threshold,
      })
      return {
        disconnect,
        observe,
      }
    })
    const originalObserver = (window as any).IntersectionObserver;
    (window as any).IntersectionObserver = observerMock

    const wrapper = mount(TestComponent, {
      slots: {
        default: () => h('div', 'foo'),
      },
    })

    await flushPromises()

    console.log(observe.mock.calls.length)
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenLastCalledWith(wrapper.element)
    expect(observerMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toBe('')

    const handle: any = observerMock.mock.calls[0][0]

    handle([{
      intersectionRatio: 1,
    }])

    await flushPromises()

    expect(wrapper.text()).toBe('foo')

    handle([{
      intersectionRatio: 0,
    }])

    await flushPromises()

    expect(wrapper.text()).toBe('')

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledTimes(2)

    window.IntersectionObserver = originalObserver
  })
})
