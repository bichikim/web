import {describe, expect, it} from 'vitest'
import {stringifyFocusPosition} from '../stringify-focus-position'

describe('stringifyFocusPosition', () => {
  it('should stringify a focus position array', () => {
    const focusPosition = [
      {x: 1, y: 2},
      {x: 3, y: 4},
    ]

    expect(stringifyFocusPosition(focusPosition)).toBe('1,2|3,4')
  })

  it('should stringify a focus position array with a single point', () => {
    const focusPosition = [{x: 1, y: 2}]

    expect(stringifyFocusPosition(focusPosition)).toBe('1,2')
  })
})
