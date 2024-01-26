/**
 * @jest-environment jsdom
 */
import {flushPromises} from '@vue/test-utils'
import {mountComposition} from '@winter-love/test-utils'
import {ref} from 'vue'
import {onAnimationRepeater} from '../'

describe('animation-repeater', () => {
  let tick
  const requestAnimationFrame: any = jest.fn((callback) => {
    tick = callback
    return 'flag'
  })
  const cancelAnimationFrame = jest.fn()
  let _requestAnimationFrame
  let _cancelAnimationFrame
  beforeEach(() => {
    _requestAnimationFrame = window.requestAnimationFrame
    window.requestAnimationFrame = requestAnimationFrame
    _cancelAnimationFrame = window.cancelAnimationFrame
    window.cancelAnimationFrame = cancelAnimationFrame
  })

  afterEach(() => {
    window.requestAnimationFrame = _requestAnimationFrame
    window.cancelAnimationFrame = _cancelAnimationFrame
  })

  it('should on', async () => {
    const wrapper = mountComposition(() => {
      const valueRef = ref(0)
      const isRun = onAnimationRepeater(() => {
        valueRef.value += 1
      })
      return {
        isRun,
        value: valueRef,
      }
    })

    expect(wrapper.setupState.value).toBe(0)
    expect(wrapper.setupState.isRun).toBe(true)
    tick()
    await flushPromises()
    expect(wrapper.setupState.value).toBe(1)
    expect(wrapper.setupState.isRun).toBe(true)

    wrapper.setupState.isRun = false
    tick()
    await flushPromises()
    expect(cancelAnimationFrame).toBeCalledTimes(1)
    expect(wrapper.setupState.value).toBe(1)
    expect(wrapper.setupState.isRun).toBe(false)

    wrapper.setupState.isRun = false
    tick()
    await flushPromises()
    expect(wrapper.setupState.value).toBe(1)
    expect(wrapper.setupState.isRun).toBe(false)

    wrapper.setupState.isRun = true
    tick()
    await flushPromises()

    expect(wrapper.setupState.value).toBe(2)
    expect(wrapper.setupState.isRun).toBe(true)

    wrapper.setupState.isRun = false
    tick()
    await flushPromises()

    expect(wrapper.setupState.value).toBe(2)
    expect(wrapper.setupState.isRun).toBe(false)
  })
})
