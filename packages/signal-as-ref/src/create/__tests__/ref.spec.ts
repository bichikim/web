import {createRef} from '../ref'
import {signal} from '@preact/signals'

describe('create ref', () => {
  it('should return ref (signal)', () => {
    const ref = createRef(signal)
    const valueRef = ref('foo')

    expect(valueRef.value).toBe('foo')

    valueRef.value = 'bar'

    expect(valueRef.value).toBe('bar')
  })
})
