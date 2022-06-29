import {flushPromises} from '@vue/test-utils'
import {mountUse} from '@winter-love/test-use'
import {getWindow} from '@winter-love/utils'
import {ref} from 'vue-demi'
import {onAnimationRepeater} from '../'

jest.mock('@winter-love/utils', () => {
  return {
    getWindow: jest.fn(),
  }
})

const mockGetWindow: jest.Mock = getWindow as any

const setup = () => {
  const window = (() => {
    let _handle
    return {
      cancelAnimationFrame: jest.fn(() => {
        _handle = undefined
      }),
      requestAnimationFrame: jest.fn((handle) => {
        _handle = handle
        return 'cancel'
      }),
      trigger: () => _handle?.(),
    }
  })()

  mockGetWindow.mockImplementation(() => {
    return window
  })

  const wrapper = mountUse(() => {
    const countRef = ref(0)
    const isRun = onAnimationRepeater(() => {
      countRef.value += 1
    })
    const toggle = () => {
      isRun.value = !isRun.value
    }
    return {
      count: countRef,
      isRun: isRun,
      toggle,
    }
  })

  return {
    ...wrapper,
    window,
  }
}

describe('animation-repeater', () => {
  beforeEach(() => {
    mockGetWindow.mockRestore()
  })

  it('should on', async () => {
    const {result, window} = setup()

    expect(result.count).toBe(0)
    expect(result.isRun).toBe(true)
    window.trigger()
    await flushPromises()
    expect(result.count).toBe(1)
    expect(result.isRun).toBe(true)

    await result.toggle()
    window.trigger()
    await flushPromises()
    expect(window.cancelAnimationFrame).toBeCalledTimes(1)
    expect(result.count).toBe(1)
    expect(result.isRun).toBe(false)

    result.toggle()
    window.trigger()
    await flushPromises()

    expect(result.isRun).toBe(true)
    expect(result.count).toBe(1)

    result.toggle()
    window.trigger()
    await flushPromises()

    expect(result.isRun).toBe(false)
    expect(result.count).toBe(1)

    await result.toggle()
    window.trigger()
    await flushPromises()

    expect(result.isRun).toBe(true)
    expect(result.count).toBe(2)
  })
})
