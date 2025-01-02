import {ref} from 'vue'
import {toEachRefs} from '../'
import {flushPromises} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'

describe('toRefs', () => {
  it('should a ref object from object ref', () => {
    const target = ref<{name?: string}>({
      name: 'foo',
    })
    const result = toEachRefs(target)

    expect(result.name?.value).toBe('foo')

    target.value = {name: 'bar'}
    expect(result.name?.value).toBe('bar')
  })
  it('should empty object from no object ref', () => {
    const target = ref(100)
    const result: any = toEachRefs(target)

    expect(result?.name?.value).toBe(undefined)
  })
  it('should empty object from no object ref', async () => {
    const target = ref<{name?: string}>({name: undefined})
    const result = toEachRefs(target)

    expect(result.name?.value).toBe(undefined)

    target.value = {name: 'foo'}

    await flushPromises()

    expect(result.name?.value).toBe('foo')
  })
})
