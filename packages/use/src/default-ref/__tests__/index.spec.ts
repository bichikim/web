import {expectType} from 'tsd'
import {Ref, ref, WritableComputedRef} from 'vue'
import {defaultRef} from '../'

describe('useDefaultRef', () => {
  it('should resolve undefined with a defaultValue', () => {
    const valueRef = ref(undefined)
    const result = defaultRef(valueRef, 'foo')
    expect(result.value).toBe('foo')
    valueRef.value = 'john'
    expect(result.value).toBe('john')
    valueRef.value = undefined
    expect(result.value).toBe('foo')
  })
  it('should resolve undefined with a function defaultValue', () => {
    const valueRef = ref(undefined)
    const result = defaultRef(valueRef, () => 'foo')
    expect(result.value).toBe('foo')
    valueRef.value = 'john'
    expect(result.value).toBe('john')
    valueRef.value = undefined
    expect(result.value).toBe('foo')
  })
  it('should resolve a ref with a defaultValue and the defaultValueOnce', () => {
    const valueref = ref()
    const result = defaultRef(valueref, 'foo', true)
    expect(result.value).toEqual('foo')

    valueref.value = 'bar'
    expect(result.value).toBe('bar')

    valueref.value = undefined
    expect(result.value).toBeUndefined()
    expectType<Ref<string>>(result)
  })
  it('should resolve a ref with a function defaultValue and the defaultValueOnce', () => {
    const value = ref()
    const result = defaultRef(value, () => 'foo', true)
    expect(result.value).toEqual('foo')

    value.value = 'bar'
    expect(result.value).toBe('bar')

    value.value = undefined
    expect(result.value).toBeUndefined()
    expectType<Ref<string>>(result)
  })
})
