import {expectType} from 'tsd'
import {computed, ref, Ref} from 'vue'
import {resolveRef} from '../'

describe('resolveRef', () => {
  it('should resolve a ref with null', () => {
    const result = resolveRef(null)
    expect(result.value).toBeNull()
  })
  it('should resolve a ref with undefined', () => {
    const result = resolveRef(undefined)
    expect(result.value).toBeUndefined()
  })
  it('should resolve an object', () => {
    const result = resolveRef({})
    expect(result.value).toEqual({})
  })
  it('should resolve a ref and detect changes', () => {
    const value = ref('foo')
    const result = resolveRef(value)
    expect(result.value).toBe('foo')

    value.value = 'bar'
    expect(result.value).toBe('bar')
    expectType<Ref<string>>(result)
  })
  it('should resolve a undefined ref and detect changes with null', () => {
    const value = ref()
    const result = resolveRef(value)
    expect(result.value).toEqual(undefined)

    value.value = null
    expect(result.value).toEqual(null)
    expectType<Ref<string>>(result)

    value.value = 'bar'
    expect(result.value).toEqual('bar')
    expectType<Ref<string>>(result)
  })
  it('should update readonly ref', () => {
    const value = ref('foo')

    const result = resolveRef(value, true)

    expect(result.value).toBe('foo')

    value.value = 'bar'

    expect(result.value).toBe('bar')

    result.value = 'john'

    expect(result.value).toBe('john')
  })
  it('should not update readonly ref', () => {
    const value = ref('foo')
    const computedValue = computed(() => value.value)

    const result = resolveRef(computedValue, true)

    expect(result.value).toBe('foo')

    value.value = 'bar'

    expect(result.value).toBe('bar')

    result.value = 'john'

    expect(result.value).toBe('bar')
  })
  it('should not update with off update original', () => {
    const value = ref('foo')
    const computedValue = computed(() => value.value)

    const result = resolveRef(computedValue)

    expect(result.value).toBe('foo')

    value.value = 'bar'

    expect(result.value).toBe('bar')

    result.value = 'john'

    expect(result.value).toBe('bar')
  })
})
