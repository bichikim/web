import {resolveRef} from 'src/refs/resolve-ref'
import {ref} from 'vue'
import {defaultRef} from '../'
import {describe, expect, it} from 'vitest'

describe('defaultRef with bind ref', () => {
  it('should return the default value', () => {
    const result = defaultRef(resolveRef(undefined), 'foo')
    expect(result.value).toBe('foo')
  })
  it('should return the default value with a ref', () => {
    const valueRef: any = ref(undefined)
    const result = defaultRef(valueRef, 'foo')
    expect(result.value).toBe('foo')

    valueRef.value = 'bar'

    expect(result.value).toBe('bar')
  })
})
