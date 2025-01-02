import {describe, expect, it} from 'vitest'
import {ref} from 'vue'
import {bunchRef} from '../'

describe('bunchRef', () => {
  it('should return a ref with bunch refs', async () => {
    const fooRef = ref()
    const barRef = ref()
    const valueRef = bunchRef(fooRef, barRef)

    expect(valueRef.value).toBe(fooRef.value)

    barRef.value = 'bar'

    expect(valueRef.value).toBe('bar')

    fooRef.value = 'foo'

    expect(valueRef.value).toBe('foo')

    fooRef.value = 'foo1'
    barRef.value = 'bar1'

    expect(valueRef.value).toBe('bar1')

    fooRef.value = 'foo2'

    expect(valueRef.value).toBe('foo2')
  })
  it('should return a ref without undefined', () => {
    {
      const fooRef = ref()
      const barRef = ref('bar')
      const valueRef = bunchRef(fooRef, barRef)

      expect(valueRef.value).toBe(barRef.value)
    }

    {
      const fooRef = ref('foo')
      const barRef = ref()
      const valueRef = bunchRef(fooRef, barRef)

      expect(valueRef.value).toBe(fooRef.value)
    }
  })
})
