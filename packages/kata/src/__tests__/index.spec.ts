import {empty, pipe, pop, push, size, top} from '../10828'
import {describe, expect, it} from 'vitest'

describe('Stack', () => {
  it('should run functions and result result', () => {
    const [_, print] = pipe([
      push(1),
      push(2),
      top,
      size,
      empty,
      pop,
      pop,
      pop,
      size,
      empty,
      pop,
      push(3),
      empty,
      top,
    ])([[], []])

    expect(print).toEqual(['2', '2', '0', '2', '1', '-1', '0', '1', '-1', '0', '3'])
  })
})
