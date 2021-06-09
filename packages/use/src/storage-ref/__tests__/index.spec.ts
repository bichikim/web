import {storageRef} from '../'
import {flushPromises} from '@vue/test-utils'

describe('storageRef', () => {
  it.only('should change', async () => {
    const valueRef = storageRef('foo', {type: 'local'})
    expect(valueRef.value).toBe(undefined)
    localStorage.setItem('foo', 'bar')
    await flushPromises()
    expect(valueRef.value).toBe('bar')
  })
})
