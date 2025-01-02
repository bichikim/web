/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {defineComponent, ref} from 'vue'
import {toggleRef} from '../'

describe('toggle', () => {
  it('should change value', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const original = ref(false)
          const [value, toggle] = toggleRef(original)

          return {
            original,
            toggle,
            value,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.value).toBe(false)
    setupState.toggle()
    await flushPromises()
    expect(setupState.value).toBe(true)
    setupState.toggle()
    await flushPromises()
    expect(setupState.value).toBe(false)
    setupState.original = true
    await flushPromises()
    expect(setupState.value).toBe(true)
  })
})

describe('toggle', () => {
  it('should ', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const [value, toggle] = toggleRef()

          return {
            toggle,
            value,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.value).toBe(false)
    setupState.toggle()
    await flushPromises()
    expect(setupState.value).toBe(true)
  })
})
