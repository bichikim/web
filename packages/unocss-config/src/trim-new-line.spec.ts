import {describe, expect, it} from 'vitest'
import {trimNewLine} from './trim-new-line'

describe('trim-new-line', () => {
  it.each([
    //
    `foo `,
    `foo
    `,
  ])('should trim new line', (input) => {
    expect(trimNewLine(input)).toBe('foo ')
  })
})
