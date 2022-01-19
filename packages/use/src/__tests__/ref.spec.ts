import {ref, watch} from 'vue'
import {flushPromises} from '@vue/test-utils'

describe('vue ref', () => {
  it('should react deeply', async () => {
    const valueRef = ref<string[]>([])
    const hook = jest.fn()

    watch(valueRef, hook)

    expect(hook).not.toBeCalled()

    valueRef.value.push('foo')

    await flushPromises()

    expect(hook).not.toBeCalled()
  })
  it('should react deeply', async () => {
    const valueRef = ref<string[]>([])
    const hook = jest.fn()

    watch(valueRef, hook, {deep: true})

    expect(hook).not.toBeCalled()

    valueRef.value.push('foo')

    await flushPromises()

    expect(hook).toBeCalled()
  })
})
