import {describe, expect, it} from 'vitest'
import {createEditorOffsets} from '../create-editor-offsets'

describe('createEditorOffsets', () => {
  it('should preserve UTF-16 positions across mixed line separators', () => {
    const source = '한😀\r\nsecond\rthird\nlast\r\n'
    const offsets = createEditorOffsets(source)
    for (let index = 0; index <= source.length; index += 1) {
      expect(offsets.toEditor(index)).toBe(source.slice(0, index).replace(/\r\n|\r/gu, '\n').length)
    }
    expect(offsets.toSource(offsets.toEditor(source.indexOf('third')))).toBe(
      source.indexOf('third'),
    )
    expect(offsets.toSource(offsets.toEditor(source.length))).toBe(source.length)
  })
  it('should leave LF-only positions unchanged', () => {
    const offsets = createEditorOffsets('first\nsecond\n')
    expect(offsets.toSource(9)).toBe(9)
    expect(offsets.toEditor(9)).toBe(9)
  })
})
