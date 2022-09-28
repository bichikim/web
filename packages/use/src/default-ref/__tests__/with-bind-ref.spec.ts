import {resolveRef} from 'src/resolve-ref'
import {ref} from 'vue'
import {defaultRef} from '../'

describe('defaultRef with bind ref', () => {
  it('should return the default value', () => {
    const result = defaultRef(resolveRef(undefined), 'foo')
    expect(result.value).toBe('foo')
  })
  it('should return the default value with a ref', () => {
    const valueRef = ref(undefined)
    const result = defaultRef(valueRef, 'foo')
    expect(result.value).toBe('foo')

    valueRef.value = 'bar'

    expect(result.value).toBe('bar')
  })
})
