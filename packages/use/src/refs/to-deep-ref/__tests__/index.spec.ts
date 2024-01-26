/**
 * @jest-environment jsdom
 */
import {flushPromises, mountComposition} from '@winter-love/test-utils'
import {reactive, ref, watch} from 'vue'
import {toDeepRef} from '../'

describe('deep bind ref', () => {
  it('should compute deep tree ref', async () => {
    const target = ref({info: {name: 'foo'}})
    const changed = jest.fn()
    const wrapper = mountComposition(() => {
      const data = toDeepRef(target, ['info', 'name'])
      watch(data, changed)
      return {
        data,
      }
    })

    expect(wrapper.setupState.data).toBe('foo')
    expect(changed).toBeCalledTimes(0)

    target.value.info.name = 'bar'
    await flushPromises()

    expect(wrapper.setupState.data).toBe('bar')
    expect(changed).toBeCalledTimes(1)

    wrapper.setupState.data = 'john'
    await flushPromises()

    expect(target.value.info.name).toBe('john')
    expect(changed).toBeCalledTimes(2)
  })
  it('should compute deep tree reactive', async () => {
    const target = reactive({info: {name: 'foo'}})
    const changed = jest.fn()
    const wrapper = mountComposition(() => {
      const data = toDeepRef(target, ['info', 'name'])
      watch(data, changed)
      return {
        data,
      }
    })

    expect(wrapper.setupState.data).toBe('foo')
    expect(changed).toBeCalledTimes(0)

    target.info.name = 'bar'
    await flushPromises()

    expect(wrapper.setupState.data).toBe('bar')
    expect(changed).toBeCalledTimes(1)

    wrapper.setupState.data = 'john'
    await flushPromises()

    expect(target.info.name).toBe('john')
    expect(changed).toBeCalledTimes(2)
  })
})
