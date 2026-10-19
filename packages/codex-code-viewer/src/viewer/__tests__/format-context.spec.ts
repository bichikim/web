import {describe, expect, it} from 'vitest'
import {formatContext} from '../format-context'

describe('formatContext', () => {
  it('should attach the exact editor snapshot with its location and distinguish it from disk', () => {
    const text = 'const changed = "draft"'
    const result = formatContext({
      column: 1,
      endColumn: 24,
      endLine: 2,
      kind: 'code',
      line: 2,
      path: '/project/main.ts',
      text,
    })
    expect(result).toContain('/project/main.ts:2:1-2:24')
    expect(result).toContain('may include unsaved edits')
    expect(result).toContain('does not save the file')
    expect(result.endsWith(text)).toBe(true)
  })

  it('should preserve ordinary file range context', () => {
    expect(formatContext({column: 1, endLine: 3, line: 3, path: '/project/main.ts'})).toBe(
      'The user selected /project/main.ts:3:1 in Code Viewer.',
    )
  })
})
