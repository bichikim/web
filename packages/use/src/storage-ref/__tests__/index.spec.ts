import {storageRef} from '../'
import {flushPromises} from '@vue/test-utils'
import {ref} from 'vue'

describe('storageRef', () => {
  it('should change localStorage by ref', async () => {
    const valueRef = storageRef('foo')
    valueRef.value = 'bar'
    await flushPromises()
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.removeItem('foo')
  })
  it('should change localStorage by value', () => {
    const valueRef = storageRef('foo', 'bar')
    expect(valueRef.value).toBe('bar')
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.clear()
  })
  it('should change localStorage by value deeply', async () => {
    const valueRef = storageRef<string[]>('foo', [], {deep: true})
    expect(valueRef.value).toEqual([])
    expect(localStorage.getItem('foo')).toBe('[]')
    valueRef.value.push('foo')
    await flushPromises()
    expect(localStorage.getItem('foo')).toBe('["foo"]')
    localStorage.clear()
  })
  it('should change localStorage by ref value', async () => {
    const originalValueRef = ref('bar')
    const valueRef = storageRef('bar', originalValueRef)
    expect(valueRef.value).toBe('bar')
    expect(localStorage.getItem('bar')).toBe('"bar"')
    originalValueRef.value = 'john'
    await flushPromises()
    expect(valueRef.value).toBe('john')
    expect(localStorage.getItem('bar')).toBe('"john"')
    localStorage.removeItem('bar')
  })
  it('should change with the window storage event', async () => {
    const valueRef = storageRef('john')
    expect(valueRef.value).toBe(undefined)
    localStorage.setItem('john', '"bar"')
    window.dispatchEvent(new Event('storage'))
    await flushPromises()
    expect(valueRef.value).toBe('bar')
    localStorage.removeItem('john')
  })
})
