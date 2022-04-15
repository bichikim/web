import {ref} from '../'

describe('ref', () => {
  it('should run well', () => {
    const value = ref<string>('foo')
    expect(value()).toBe('foo')
    value('bar')
    expect(value()).toBe('bar')
    expect(`foo${value}`).toBe('foobar')
    expect(`${value}`).toBe('bar')
    const numberValue = ref(1)
    expect(numberValue + 1).toBe(2)
    expect(numberValue + numberValue).toBe(2)
  })
})
