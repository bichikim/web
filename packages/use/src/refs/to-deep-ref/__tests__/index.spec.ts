/**
 * @vitest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, reactive, ref, watch} from 'vue'
import {toDeepRef} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('deep bind ref', () => {
  it('should compute deep tree ref', async () => {
    const target = ref({info: {name: 'foo'}})
    const changed = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const data = toDeepRef(target, ['info', 'name'])

          watch(data, changed)

          return {
            data,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.data).toBe('foo')
    expect(changed).toBeCalledTimes(0)

    target.value.info.name = 'bar'
    await flushPromises()

    expect(setupState.data).toBe('bar')
    expect(changed).toBeCalledTimes(1)

    setupState.data = 'john'
    await flushPromises()

    expect(target.value.info.name).toBe('john')
    expect(changed).toBeCalledTimes(2)
  })
  it('should compute deep tree reactive', async () => {
    const target = reactive({info: {name: 'foo'}})
    const changed = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup: () => {
          const data = toDeepRef(target, ['info', 'name'])

          watch(data, changed)

          return {
            data,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.data).toBe('foo')
    expect(changed).toBeCalledTimes(0)

    target.info.name = 'bar'
    await flushPromises()

    expect(setupState.data).toBe('bar')
    expect(changed).toBeCalledTimes(1)

    setupState.data = 'john'
    await flushPromises()

    expect(target.info.name).toBe('john')
    expect(changed).toBeCalledTimes(2)
  })
})
