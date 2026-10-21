import {expect, it} from 'vitest'
import {offsetPosition, sourceOffset} from '../position'
it('should retain UTF-16 columns across CRLF and non-BMP characters', () => {
  const source = 'first\r\n😀text'
  const offset = sourceOffset(source, 2, 3)
  expect(source.slice(offset)).toBe('text')
  expect(offsetPosition(source, offset)).toEqual({character: 2, line: 1})
  expect(offsetPosition(source, offset, 'utf-32')).toEqual({character: 1, line: 1})
})
