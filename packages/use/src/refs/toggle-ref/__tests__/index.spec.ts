/**
 * @jest-environment jsdom
 */
import {flushPromises, mountComposition} from '@winter-love/vue-test'
import {ref} from 'vue'
import {toggleRef} from '../'

describe('toggle', () => {
  it('should change value', async () => {
    const wrapper = mountComposition(() => {
      const original = ref(false)
      const [value, toggle] = toggleRef(original)
      return {
        original,
        toggle,
        value,
      }
    })

    expect(wrapper.setupState.value).toBe(false)
    wrapper.setupState.toggle()
    await flushPromises()
    expect(wrapper.setupState.value).toBe(true)
    wrapper.setupState.toggle()
    await flushPromises()
    expect(wrapper.setupState.value).toBe(false)
    wrapper.setupState.original = true
    await flushPromises()
    expect(wrapper.setupState.value).toBe(true)
  })
})

describe('toggle', () => {
  it('should ', async () => {
    const wrapper = mountComposition(() => {
      const [value, toggle] = toggleRef()
      return {
        toggle,
        value,
      }
    })

    expect(wrapper.setupState.value).toBe(false)
    wrapper.setupState.toggle()
    await flushPromises()
    expect(wrapper.setupState.value).toBe(true)
  })
})
