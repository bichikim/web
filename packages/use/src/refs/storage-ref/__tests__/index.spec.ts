/**
 * @jest-environment jsdom
 */
import {storageRef} from '../'
import {flushPromises} from '@vue/test-utils'
import {effectScope, ref} from 'vue'

describe('storageRef', () => {
  afterEach(() => {
    localStorage.setItem('foo', null as any)
  })
  it('should change localStorage by ref', async () => {
    const scope = effectScope()
    const valueRef: any = scope.run(() => {
      return storageRef('local', 'foo')
    })
    expect(localStorage.getItem('foo')).toBe(null)
    valueRef.value = 'bar'
    await flushPromises()
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.removeItem('foo')
  })
  it('should change localStorage by value', () => {
    const scope = effectScope()
    const valueRef = scope.run(() => {
      return storageRef('local', 'foo', 'bar')
    })
    expect(valueRef?.value).toBe('bar')
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.clear()
    scope.stop()
  })
  it('should not change localStorage by value', () => {
    const scope = effectScope()
    localStorage.setItem('foo', '"foo"')
    const valueRef = scope.run(() => {
      return storageRef('local', 'foo', 'bar')
    })
    expect(valueRef?.value).toBe('bar')
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.clear()
  })
  it('should change localStorage by value with rest', () => {
    const scope = effectScope()
    localStorage.setItem('foo', '"foo"')
    const valueRef = scope.run(() => {
      return storageRef('local', 'foo', 'bar', {reset: true})
    })
    expect(valueRef?.value).toBe('bar')
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.clear()
  })
  it('should change localStorage by ref value', async () => {
    const scope = effectScope()
    const originalValueRef = ref('bar')
    const valueRef = scope.run(() => {
      return storageRef('local', 'bar', originalValueRef)
    })
    expect(valueRef?.value).toBe('bar')
    expect(localStorage.getItem('bar')).toBe('"bar"')
    originalValueRef.value = 'john'
    await flushPromises()
    expect(valueRef?.value).toBe('john')
    expect(localStorage.getItem('bar')).toBe('"john"')
    localStorage.removeItem('bar')
    scope.stop()
  })
  it('should change with the window storage event', async () => {
    const scope = effectScope()
    const valueRef = scope.run(() => {
      return storageRef('local', 'john')
    })
    expect(valueRef?.value).toBe(null)
    localStorage.setItem('john', '"bar"')
    window.dispatchEvent(new Event('storage'))
    await flushPromises()
    expect(valueRef?.value).toBe('bar')
    localStorage.removeItem('john')
    scope.stop()
  })
})
