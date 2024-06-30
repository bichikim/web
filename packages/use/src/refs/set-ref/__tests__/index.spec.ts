import {setRef} from '../'
import {computed, ref} from 'vue'
import {describe, expect, it} from 'vitest'

describe('setRef', () => {
  it('should set value with a ref target', () => {
    const value = ref('foo')

    setRef(value, 'bar')

    expect(value.value).toBe('bar')
  })
  it('should set value with a writeable target', () => {
    const value = ref('foo')
    const computedValue = computed({
      get() {
        return value.value
      },
      set(_value) {
        value.value = _value
      },
    })

    setRef(computedValue, 'bar')

    expect(computedValue.value).toBe('bar')
    expect(value.value).toBe('bar')
  })
  it('should set value with a ref source', () => {
    const value = ref('foo')
    const source = ref('bar')

    setRef(value, source)

    expect(value.value).toBe('bar')
  })
  it('should set value with a computed source', () => {
    const value = ref('foo')
    const source = computed(() => `${value.value}++`)

    setRef(value, source)

    expect(value.value).toBe('foo++')
  })
})
