import {bunchRef} from 'src/refs/bunch-ref'
import {ref} from 'vue'
import {defaultRef} from '../'
import {describe, expect, it} from 'vitest'

describe('defaultRef with bunch ref', () => {
  it('should return ref with a default value', () => {
    const barRef = ref()
    const fooRef = ref()
    const result = defaultRef(bunchRef(barRef, fooRef), 'defaultValue')

    expect(result.value).toBe('defaultValue')

    fooRef.value = 'foo1'

    expect(result.value).toBe('foo1')

    fooRef.value = 'foo2'

    expect(result.value).toBe('foo2')

    barRef.value = 'bar1'

    expect(result.value).toBe('bar1')
  })
})
