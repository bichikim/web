/**
 * @vitest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {getWindow} from '@winter-love/utils'
import {defineComponent, h, ref} from 'vue'
import {onIntersection} from '../'
import {describe, expect, it, vi} from 'vitest'

vi.mock('@winter-love/utils', async () => {
  const actual: any = await vi.importActual('@winter-love/utils')
  return {
    ...actual,
    getWindow: vi.fn(actual.getWindow),
  }
})

const _getWindow = vi.mocked(getWindow)

describe('on-element-intersection', () => {
  const setup = () => {
    const TestComponent = defineComponent((_, {slots}) => {
      const elementRef = ref()
      const showRef = ref()

      onIntersection(
        elementRef,
        (entries) => {
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
        },
        {
          threshold,
        },
      )

      return () =>
        h(
          'div',
          {
            ref: elementRef,
            style: {
              backgroundColor: 'red',
              height: '100px',
              marginBottom: '10px',
              width: '100%',
            },
          },
          showRef.value ? slots.default?.() : undefined,
        )
    })
    let observerTrigger: any
    const threshold = 0.05
    const disconnect = vi.fn()
    const observe = vi.fn()
    const observerMock = vi.fn((callback) => {
      observerTrigger = callback
      return {
        disconnect,
        observe,
      }
    })
    const originalObserver = (window as any).IntersectionObserver
    ;(window as any).IntersectionObserver = observerMock

    const teardown = () => {
      _getWindow.mockClear()
      window.IntersectionObserver = originalObserver
    }

    const wrapper = mount(TestComponent, {
      slots: {
        default: () => h('div', 'foo'),
      },
    })

    return {
      TestComponent,
      disconnect,
      observe,
      observerMock,
      observerTrigger,
      teardown,
      wrapper,
    }
  }

  it('should show or hide element', async () => {
    const {disconnect, observe, observerMock, teardown, observerTrigger, wrapper} =
      setup()

    await flushPromises()
    expect(disconnect).toHaveBeenCalledTimes(0)
    expect(observe).toHaveBeenLastCalledWith(wrapper.element)
    expect(observerMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toBe('')

    observerTrigger([
      {
        intersectionRatio: 1,
      },
    ])

    await flushPromises()

    expect(wrapper.text()).toBe('foo')

    observerTrigger([
      {
        intersectionRatio: 0,
      },
    ])

    await flushPromises()

    expect(wrapper.text()).toBe('')

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledTimes(1)

    teardown()
  })

  it('should not run any in SSR environment', async () => {
    _getWindow.mockReturnValueOnce(null)
    const {teardown, observerMock} = setup()
    expect(observerMock).not.toHaveBeenCalled()

    teardown()
  })
})
