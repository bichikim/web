import {describe, expect, it} from 'vitest'
import {getArrowKeyDelta} from '../'

describe('getArrowKeyDelta', () => {
  it.each([
    {delta: {x: 0, y: 7}, key: 'ArrowDown'},
    {delta: {x: -7, y: 0}, key: 'ArrowLeft'},
    {delta: {x: 7, y: 0}, key: 'ArrowRight'},
    {delta: {x: 0, y: -7}, key: 'ArrowUp'},
  ])('should move by the configured step for $key', ({delta, key}) => {
    expect(getArrowKeyDelta(key, 7)).toEqual(delta)
  })

  it('should default to a unit step', () => {
    expect(getArrowKeyDelta('ArrowRight')).toEqual({x: 1, y: 0})
  })

  it.each([0, 0.25, -3])('should preserve the supplied step %s', (step) => {
    expect(getArrowKeyDelta('ArrowRight', step)).toEqual({x: step, y: 0})
    expect(getArrowKeyDelta('ArrowUp', step)).toEqual({x: 0, y: -step})
  })

  it.each(['Enter', 'Escape', 'Home', 'arrowright', ''])(
    'should ignore the non-arrow key %s',
    (key) => {
      expect(getArrowKeyDelta(key)).toBeNull()
    },
  )
})
