import {createStateUpdaterWithArgs} from '../'
import {describe, expect, it} from 'vitest'

describe('createStateUpdaterWithArgs', () => {
  it('should keep state and update', () => {
    const stateFunc = createStateUpdaterWithArgs('foo', (state, name: string) => {
      return `${state}-${name}`
    })

    expect(stateFunc('bar')).toBe('foo-bar')
    expect(stateFunc('john')).toBe('foo-bar-john')
  })
})
