/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {isSSR} from '@winter-love/utils'
import {defineComponent, h, ref} from 'vue'
import {onElementIntersection} from '../'

jest.mock('@winter-love/utils', () => {
  const actual = jest.requireActual('@winter-love/utils')
  return {
    ...actual,
    isSSR: jest.fn(actual.isSSR),
  }
})

const _isSSR = jest.mocked(isSSR)

describe('on-element-intersection', () => {
  const threshold = 0.05
  const TestComponent = defineComponent((props, {slots}) => {
    const elementRef = ref()
    const showRef = ref()

    onElementIntersection(
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

        return () =>
          h(
            'div',
            {
              ref: elementRef,
              style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
            },
            showRef.value ? slots.default?.() : undefined,
          )
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
          style: {backgroundColor: 'red', height: '100px', marginBottom: '10px', width: '100%'},
        },
        showRef.value ? slots.default?.() : undefined,
      )
  })
  let disconnect
  let observe
  let observerMock
  let originalObserver
  beforeEach(() => {
    disconnect = jest.fn()
    observe = jest.fn()
    observerMock = jest.fn(() => {
      return {
        disconnect,
        observe,
      }
    })
    originalObserver = (window as any).IntersectionObserver
    ;(window as any).IntersectionObserver = observerMock
  })
  afterEach(() => {
    jest.resetAllMocks()
    window.IntersectionObserver = originalObserver
  })
  it('should show or hide element', async () => {
    const wrapper = mount(TestComponent, {
      slots: {
        default: () => h('div', 'foo'),
      },
    })

    await flushPromises()
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenLastCalledWith(wrapper.element)
    expect(observerMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toBe('')

    const handle: any = observerMock.mock.calls[0][0]

    handle([
      {
        intersectionRatio: 1,
      },
    ])

    await flushPromises()

    expect(wrapper.text()).toBe('foo')

    handle([
      {
        intersectionRatio: 0,
      },
    ])

    await flushPromises()

    expect(wrapper.text()).toBe('')

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledTimes(2)
  })
  it('should not run any in SSR environment', async () => {
    _isSSR.mockReturnValueOnce(true)
    mount(TestComponent, {
      slots: {
        default: () => h('div', 'foo'),
      },
    })
    expect(observerMock).not.toHaveBeenCalled()
  })
})
