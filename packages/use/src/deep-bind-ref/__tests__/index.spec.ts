/**
 * @jest-environment jsdom
 */
import {flushPromises, mountComposition} from '@winter-love/vue-test'
import {ref, watch} from 'vue'
import {bindDeep} from '../'

describe('deep bind ref', () => {
  it('should bind deep tree ref', async () => {
    const target = ref({info: {name: 'foo'}})
    const changed = jest.fn()
    const wrapper = mountComposition(() => {
      const data = bindDeep(target, ['info', 'name'])
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
})
