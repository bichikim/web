import {stateful} from '../'

describe('state', () => {
  it('should keep state and update', () => {
    const stateFunc = stateful('foo', (state, name: string) => {
      return state + name
    })

    expect(stateFunc('bar')).toBe('foobar')
    expect(stateFunc('john')).toBe('foobarjohn')
  })
})
