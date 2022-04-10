import {storageRef} from '../'
import {flushPromises} from '@vue/test-utils'
import {effectScope, ref} from 'vue-demi'

describe('storageRef', () => {
  it('should change localStorage by ref', async () => {
    const scope = effectScope()
    await scope.run(async () => {
      const valueRef = storageRef('foo')
      valueRef.value = 'bar'
      await flushPromises()
      expect(localStorage.getItem('foo')).toBe('"bar"')
      localStorage.removeItem('foo')
    })
  })
  it('should change localStorage by value', () => {
    const scope = effectScope()
    scope.run(() => {
      const valueRef = storageRef('foo', 'bar')
      expect(valueRef.value).toBe('bar')
      expect(localStorage.getItem('foo')).toBe('"bar"')
      localStorage.clear()
    })
  })
  it('should not change localStorage by value', () => {
    const scope = effectScope()
    scope.run(() => {
      localStorage.setItem('foo', '"foo"')
      const valueRef = storageRef('foo', 'bar')
      expect(valueRef.value).toBe('foo')
      expect(localStorage.getItem('foo')).toBe('"foo"')
      localStorage.clear()
    })

  })
  it('should change localStorage by value with rest', () => {
    const scope = effectScope()
    scope.run(() => {
      localStorage.setItem('foo', '"foo"')
      const valueRef = storageRef('foo', 'bar', {reset: true})
      expect(valueRef.value).toBe('bar')
      expect(localStorage.getItem('foo')).toBe('"bar"')
      localStorage.clear()
    })
  })
  it('should change localStorage by value deeply', async () => {
    const scope = effectScope()
    await scope.run(async () => {
      const valueRef = storageRef<string[]>('foo', [], {deep: true})
      expect(valueRef.value).toEqual([])
      expect(localStorage.getItem('foo')).toBe('[]')
      valueRef.value.push('foo')
      await flushPromises()
      expect(localStorage.getItem('foo')).toBe('["foo"]')
      localStorage.clear()
    })
    scope.stop()
  })
  it('should change localStorage by ref value', async () => {
    const scope = effectScope()
    await scope.run(async () => {
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
    scope.stop()
  })
  it('should change with the window storage event', async () => {
    const scope = effectScope()
    await scope.run(async () => {
      const valueRef = storageRef('john')
      expect(valueRef.value).toBe(undefined)
      localStorage.setItem('john', '"bar"')
      window.dispatchEvent(new Event('storage'))
      await flushPromises()
      expect(valueRef.value).toBe('bar')
      localStorage.removeItem('john')
    })
    scope.stop()
  })
})
