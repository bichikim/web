import {storageRef} from '../'
import {flushPromises} from '@vue/test-utils'

describe('storageRef', () => {
  it('should change localStorage by ref', async () => {
    const valueRef = storageRef('foo', {type: 'local'})
    valueRef.value = 'bar'
    await flushPromises()
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.clear()
  })
  it('should change localStorage by init', () => {
    const valueRef = storageRef('foo', {init: 'bar', type: 'local'})
    expect(valueRef.value).toBe('bar')
    expect(localStorage.getItem('foo')).toBe('"bar"')
    localStorage.clear()
  })
  it('should change with the window storage event', async () => {
    const valueRef = storageRef('foo', {type: 'local'})
    expect(valueRef.value).toBe(undefined)
    localStorage.setItem('foo', '"bar"')
    window.dispatchEvent(new Event('storage'))
    await flushPromises()
    expect(valueRef.value).toBe('bar')
    localStorage.clear()
  })
})
