import {unwrapRef} from '../'
import {computed, ref} from 'vue-demi'

describe('unwrapRef', () => {
  it('should unwrap a ref', () => {
    const result = unwrapRef(ref('7'))
    expect(result).toBe('7')
  })
  it('should unwrap a computed', () => {
    const result = unwrapRef(computed(() => '7'))
    expect(result).toBe('7')
  })
  it('should unwrap a normal value', () => {
    const result = unwrapRef('7')
    expect(result).toBe('7')
  })
  it('should unwrap an object value', () => {
    const result = unwrapRef({foo: 'bar'})
    expect(result).toEqual({foo: 'bar'})
  })
})
