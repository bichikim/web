/**
 * @jest-environment jsdom
 */

import {flushPromises} from '@vue/test-utils'
import {computed, readonly, ref} from 'vue-demi'
import {wrapRef} from '../index'

describe('wrap-ref', () => {
  it('should wrap a ref', () => {
    const valueRef = ref(1)
    const valueWrapRef = wrapRef(valueRef)

    expect(valueRef.value).toBe(1)
    expect(valueWrapRef.value).toBe(1)
    valueWrapRef.value = 2
    expect(valueRef.value).toBe(2)
    expect(valueWrapRef.value).toBe(2)
    valueWrapRef.value = 3
    expect(valueRef.value).toBe(3)
    expect(valueWrapRef.value).toBe(3)
  })

  it('should not update with a readonly original ref', async () => {
    const valueRef = ref(1)
    const valueWrapRef = wrapRef(readonly(valueRef))

    expect(valueRef.value).toBe(1)
    expect(valueWrapRef.value).toBe(1)
    valueWrapRef.value = 2
    expect(valueRef.value).toBe(1)
    expect(valueWrapRef.value).toBe(2)
    valueRef.value = 3
    expect(valueRef.value).toBe(3)
    expect(valueWrapRef.value).toBe(3)
  })

  it('should not update a computed original ref', async () => {
    const valueRef = ref(1)
    const computedRef = computed(() => valueRef.value)
    const valueWrapRef = wrapRef(computedRef)

    expect(valueRef.value).toBe(1)
    expect(computedRef.value).toBe(1)
    expect(valueWrapRef.value).toBe(1)
    valueWrapRef.value = 2
    expect(valueRef.value).toBe(1)
    expect(computedRef.value).toBe(1)
    expect(valueWrapRef.value).toBe(2)
    valueRef.value = 3
    expect(valueRef.value).toBe(3)
    expect(computedRef.value).toBe(3)
    expect(valueWrapRef.value).toBe(3)
  })
  it('should wrap ref with defaultValue', async () => {
    const valueRef = ref()
    const valueWrapRef = wrapRef(valueRef, {defaultValue: 1})
    expect(valueRef.value).toBe(undefined)
    expect(valueWrapRef.value).toBe(1)
    valueWrapRef.value = 2
    expect(valueRef.value).toBe(2)
    expect(valueWrapRef.value).toBe(2)
    valueRef.value = 3
    expect(valueRef.value).toBe(3)
    await flushPromises()
    expect(valueWrapRef.value).toBe(3)
  })
})
