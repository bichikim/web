import {statefulWithArgs} from '../'
import {describe, it, expect} from 'vitest'
describe('state', () => {
  it('should keep state and update', () => {
    const stateFunc = statefulWithArgs('foo', (state, name: string) => {
      return `${state}-${name}`
    })

    expect(stateFunc('bar')).toBe('foo-bar')
    expect(stateFunc('john')).toBe('foo-bar-john')
  })
})
