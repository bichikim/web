import {describe, expect, it} from 'vitest'
import {matchRun} from '../'

describe('matchRun', () => {
  it('should return the result of the matched function', () => {
    const value = 'A'

    const matches = {
      A: (v: string) => `Matched A: ${v}`,
      B: (v: string) => `Matched B: ${v}`,
    }
    const result = matchRun(value)(matches)

    expect(result).toBe('Matched A: A')
  })

  it('should return the result of the default function if no match is found', () => {
    const value = 'C'

    const matches = {
      A: (v: string) => `Matched A: ${v}`,
      B: (v: string) => `Matched B: ${v}`,
      default: (v: string) => `Default: ${v}`,
    }
    const result = matchRun(value)(matches)

    expect(result).toBe('Default: C')
  })

  it('should return undefined if no match is found and no default function is provided', () => {
    const value = 'C'

    const matches = {
      A: (v: string) => `Matched A: ${v}`,
      B: (v: string) => `Matched B: ${v}`,
    }
    const result = matchRun(value)(matches)

    expect(result).toBeUndefined()
  })

  it.each([
    ['A', 'Matched A: A'],
    ['B', 'Matched B: B'],
    ['C', 'Default: C'],
  ])('should return %s when value is %s', (value, expected) => {
    const matches = {
      A: (v: string) => `Matched A: ${v}`,
      B: (v: string) => `Matched B: ${v}`,
      default: (v: string) => `Default: ${v}`,
    }
    const result = matchRun(value)(matches)

    expect(result).toBe(expected)
  })
  const x = Symbol('X')
  const y = Symbol('Y')
  const z = Symbol('Z')

  it.each([
    [1, 'Matched 1: 1'],
    [2, 'Matched 2: 2'],
    [3, 'Default'],
    ['A', 'Matched A: A'],
    ['B', 'Matched B: B'],
    ['C', 'Default'],
    [x, 'Matched Symbol: x'],
    [y, 'Matched Symbol: y'],
    [z, 'Default'],
  ])('should return %s when value is %s', (value, expected) => {
    const matches = {
      '1': (v) => `Matched 1: ${v}`,
      '2': (v) => `Matched 2: ${v}`,
      A: (v) => `Matched A: ${v}`,
      B: (v) => `Matched B: ${v}`,
      default: () => `Default`,
      [x]: () => `Matched Symbol: x`,
      [y]: () => `Matched Symbol: y`,
    }
    const result = matchRun(value)(matches)

    expect(result).toBe(expected)
  })
})
