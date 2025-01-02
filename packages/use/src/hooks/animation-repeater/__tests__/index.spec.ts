/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, ref} from 'vue'
import {onAnimationRepeater} from '../'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
describe('animation-repeater', () => {
  let tick
  const requestAnimationFrame: any = vi.fn((callback) => {
    tick = callback

    return 'flag'
  })
  const cancelAnimationFrame = vi.fn()
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
    const wrapper = mount(
      defineComponent({
        setup() {
          const valueRef = ref(0)
          const isRun = onAnimationRepeater(() => {
            valueRef.value += 1
          })

          return {
            isRun,
            value: valueRef,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.value).toBe(0)
    expect(setupState.isRun).toBe(true)
    tick()
    await flushPromises()
    expect(setupState.value).toBe(1)
    expect(setupState.isRun).toBe(true)

    setupState.isRun = false
    tick()
    await flushPromises()
    expect(cancelAnimationFrame).toBeCalledTimes(1)
    expect(setupState.value).toBe(1)
    expect(setupState.isRun).toBe(false)

    setupState.isRun = false
    tick()
    await flushPromises()
    expect(setupState.value).toBe(1)
    expect(setupState.isRun).toBe(false)

    setupState.isRun = true
    tick()
    await flushPromises()

    expect(setupState.value).toBe(2)
    expect(setupState.isRun).toBe(true)

    setupState.isRun = false
    tick()
    await flushPromises()

    expect(setupState.value).toBe(2)
    expect(setupState.isRun).toBe(false)
  })
})
