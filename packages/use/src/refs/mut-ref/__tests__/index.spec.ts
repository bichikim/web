import {ref} from 'vue'
import {mutRef} from '../'

describe('bindRef', () => {
  it('should bind ref (one way)', () => {
    const value = ref('foo')
    const bindingRef = mutRef(value)

    expect(bindingRef.value).toBe('foo')
    bindingRef.value = 'bar'
    expect(bindingRef.value).toBe('bar')
    expect(value.value).toBe('foo')
    value.value = 'john'
    expect(value.value).toBe('john')
    expect(bindingRef.value).toBe('john')
  })
  it('should bind ref (one way) with an undefined ref', () => {
    const value = ref()
    const bindingRef = mutRef(value)

    expect(bindingRef.value).toBe(undefined)
    bindingRef.value = 'bar'
    expect(bindingRef.value).toBe('bar')
    expect(value.value).toBe(undefined)
    value.value = 'john'
    expect(value.value).toBe('john')
    expect(bindingRef.value).toBe('john')
  })
  it('should bind ref with a undefined value', () => {
    const bindingRef = mutRef(undefined)

    expect(bindingRef.value).toBe(undefined)
    bindingRef.value = 'bar'
    expect(bindingRef.value).toBe('bar')
    bindingRef.value = 'john'
    expect(bindingRef.value).toBe('john')
  })
})
