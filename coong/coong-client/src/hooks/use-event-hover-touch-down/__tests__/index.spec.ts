/**
 * @jest-environment jsdom
 */
import {flushPromises, h, mount, onMounted, ref} from '@winter-love/test-utils'
import {useEventHoverTouchDown} from '../'
import {elementFromPoint} from '../element-from-point'
import {onEvent} from '@winter-love/use'

jest.mock('../element-from-point', () => ({
  elementFromPoint: jest.fn(),
}))

jest.mock('@winter-love/use', () => {
  const originalModule = jest.requireActual('@winter-love/use')
  return {
    ...originalModule,
    onEvent: jest.fn(originalModule.onEvent),
  }
})

const _elementFromPoint = jest.mocked(elementFromPoint)
const _onEvent = jest.mocked(onEvent)

describe('useEventHoverTouchDown', () => {
  let startCallback
  let moveCallback
  let endCallback
  let wrapper

  beforeEach(() => {
    _onEvent.mockImplementation((_, name, callback) => {
      switch (name) {
        case 'touchstart': {
          startCallback = callback
          break
        }
        case 'touchmove': {
          moveCallback = callback
          break
        }
        case 'touchend': {
          endCallback = callback
          break
        }
      }
    })

    let _element: any
    _elementFromPoint.mockImplementation(() => _element)
    wrapper = mount({
      setup() {
        const element = ref(null)
        const state = useEventHoverTouchDown(element)

        onMounted(() => {
          _element = element.value
        })

        return () => h('div', {ref: element}, state.value)
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should state boolean', async () => {
    expect(wrapper.text()).toBe('false')

    // 해당 엘리먼트에서 터치 다운
    startCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 0, identifier: 1} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('true')

    // 해당 엘리먼트에서 터치 업
    endCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 0, identifier: 1} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('false')
  })
  it.skip('should change state correctly with down move-in move-out move-in up', async () => {
    expect(wrapper.text()).toBe('false')
    // 해당 엘리먼트에서 터치 다운
    startCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 0, identifier: 2} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('true')

    // 해당 엘리먼트에서 터치 이동
    moveCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 2, identifier: 2} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('true')

    // 해당 엘리먼트밖으로 터치 이동
    _elementFromPoint.mockImplementationOnce(() => [] as any)
    moveCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 1, identifier: 2} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('false')

    // 해당 엘리먼트안으로 터치 이동
    moveCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 0, identifier: 2} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('true')

    // 해당 엘리먼트에서 터치 업
    endCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 0, identifier: 2} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('false')
  })
  it.skip('should change state correctly with move-in move-out move-in up', async () => {
    expect(wrapper.text()).toBe('false')

    // 해당 엘리먼트에서 터치 이동
    moveCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 1, identifier: 1} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('true')

    // 해당 엘리먼트밖으로 터치 이동
    _elementFromPoint.mockImplementationOnce(() => [] as any)
    moveCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 2, identifier: 1} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('false')

    // 해당 엘리먼트안으로 터치 이동
    moveCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 1, identifier: 1} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('true')

    // 해당 엘리먼트에서 터치 업
    endCallback?.(
      new TouchEvent('foo', {
        changedTouches: [{clientX: 0, clientY: 0, identifier: 1} as any],
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toBe('false')
  })
})
