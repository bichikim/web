import {flushPromises} from '@vue/test-utils'
import {mountComposition} from '@winter-love/test-use'
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
        console.log(handle)
        return 'cancel'
      }),
      trigger: () => _handle?.(),
    }
  })()

  mockGetWindow.mockImplementation(() => {
    return window
  })

  const wrapper = mountComposition(() => {
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
    const {setupState, window} = setup()

    expect(setupState.count).toBe(0)
    expect(setupState.isRun).toBe(true)
    window.trigger()
    await flushPromises()
    expect(setupState.count).toBe(1)
    expect(setupState.isRun).toBe(true)

    await setupState.toggle()
    window.trigger()
    await flushPromises()
    expect(window.cancelAnimationFrame).toBeCalledTimes(1)
    expect(setupState.count).toBe(1)
    expect(setupState.isRun).toBe(false)

    setupState.toggle()
    window.trigger()
    await flushPromises()

    expect(setupState.isRun).toBe(true)
    expect(setupState.count).toBe(1)

    setupState.toggle()
    window.trigger()
    await flushPromises()

    expect(setupState.isRun).toBe(false)
    expect(setupState.count).toBe(1)

    await setupState.toggle()
    window.trigger()
    await flushPromises()

    expect(setupState.isRun).toBe(true)
    expect(setupState.count).toBe(2)
  })
})
