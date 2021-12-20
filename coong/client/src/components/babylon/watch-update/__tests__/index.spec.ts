import {flushPromises} from '@vue/test-utils'
import {ref} from 'vue'
import {watchUpdate} from '../'

describe('watch-update', () => {
  it('should check target and call the recipe', async () => {
    const target = ref<any>()

    watchUpdate(target, (target) => {
      target.name = 'foo'
    })

    target.value = {}

    await flushPromises()

    expect(target.value.name).toBe('foo')
  })
  it('should check targets and call the recipe', async () => {
    const target = ref<any>()
    const target2 = ref<any>()

    watchUpdate([target, target2], ([target, target2]) => {
      target.name = 'foo'
      target2.name = 'bar'
    })

    target.value = {}

    await flushPromises()

    expect(target.value.name).toBe(undefined)

    target2.value = {}

    await flushPromises()

    expect(target.value.name).toBe('foo')
    expect(target2.value.name).toBe('bar')
  })
  it('should check targets and call the recipe with other refs', async () => {
    const target = ref<any>()
    const name = ref('foo')

    watchUpdate(target, (target) => {
      target.name = name.value
    })

    target.value = {}

    await flushPromises()

    expect(target.value.name).toBe('foo')

    name.value = 'bar'

    await flushPromises()

    expect(target.value.name).toBe('bar')
  })
})
