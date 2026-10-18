import {describe, expect, it, vi} from 'vitest'
import {createSourceDocument} from '../create-source-document'

vi.mock('../../shared/editing-limits', () => ({MAX_CODE_BYTES: 24}))

describe('createSourceDocument', () => {
  it('should highlight an editable document at the byte boundary', () => {
    const document = createSourceDocument({path: 'main.ts', source: 'const value = 1'.padEnd(24)})
    expect(document.readOnly).toBeUndefined()
    expect(document.lines.flat().some((token) => token.kind === 'keyword')).toBe(true)
  })
  it('should skip full highlighting and count mixed line endings in a large document', () => {
    const source = 'const value = 1;\r\nvalue();\rvalue();\n'
    expect(createSourceDocument({column: 2, line: 50, path: 'main.ts', source})).toMatchObject({
      lineCount: 4,
      lines: [],
      location: {column: 2, line: 4},
      readOnly: true,
      source,
    })
  })
  it('should use UTF-8 bytes rather than JavaScript string length for editability', () => {
    const source = '한'.repeat(9)
    expect(createSourceDocument({path: 'main.txt', source})).toMatchObject({
      lineCount: 1,
      lines: [],
      readOnly: true,
    })
  })
  it('should preserve one empty line for an empty document', () => {
    expect(createSourceDocument({path: 'main.txt', source: ''})).toMatchObject({
      lines: [[expect.objectContaining({text: ''})]],
      location: {line: 1},
    })
  })
})
