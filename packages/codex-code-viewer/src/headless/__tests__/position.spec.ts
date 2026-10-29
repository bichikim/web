import {expect, it} from 'vitest'
import {offsetPosition, sourceOffset} from '../position'
it('should retain UTF-16 columns across CRLF and non-BMP characters', () => {
  const source = 'first\r\n😀text'
  const offset = sourceOffset(source, 2, 3)
  expect(source.slice(offset)).toBe('text')
  expect(offsetPosition(source, offset)).toEqual({character: 2, line: 1})
  expect(offsetPosition(source, offset, 'utf-32')).toEqual({character: 1, line: 1})
})

it.each(['\r', '\r\n', '\n', '\r\n\r\n'])(
  'should resolve a source offset across %j line separators',
  (separator) => {
    const source = `first${separator}😀text`
    const line = offsetPosition(source, source.indexOf('text')).line + 1
    expect(sourceOffset(source, line, 3)).toBe(source.indexOf('text'))
  },
)
