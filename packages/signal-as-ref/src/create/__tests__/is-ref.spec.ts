import {createIsRef} from '../is-ref'
import {createRef} from '../ref'
import {signal} from '@preact/signals'

describe('create ref', () => {
  it('should return ture', () => {
    const ref = createRef(signal)
    const isRef = createIsRef()
    const valueRef = ref('foo')

    expect(isRef(valueRef)).toBe(true)
    expect(isRef('foo')).toBe(false)
    expect(isRef({})).toBe(false)
  })
})
