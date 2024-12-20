/**
 * @jest-environment jsdom
 */
import {h, onMounted, ref} from 'vue'
import {mount} from '@vue/test-utils'
import flushPromises from 'flush-promises'
import {useEventHoverTouchDown} from '../'
import {elementFromPoint} from '../element-from-point'
import {onEvent} from '@winter-love/use'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('../element-from-point', async () => {
  return {
    elementFromPoint: vi.fn(),
  }
})

vi.mock('@winter-love/use', async () => {
  const originalModule: any = await vi.importActual('@winter-love/use')
  return {
    ...originalModule,
    onEvent: vi.fn(originalModule.onEvent),
  }
})

const _elementFromPoint = vi.mocked(elementFromPoint)
const _onEvent = vi.mocked(onEvent)

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
        const element = ref<any>(null)
        const state = useEventHoverTouchDown(element as any)

        onMounted(() => {
          _element = element.value
        })

        return () => h('div', {ref: element}, state.value)
      },
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
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
