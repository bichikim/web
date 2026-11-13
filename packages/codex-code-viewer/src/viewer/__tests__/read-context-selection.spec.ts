/** @vitest-environment jsdom */
import {describe, expect, it} from 'vitest'
import {readContextSelection} from '../read-context-selection'

describe('readContextSelection', () => {
  it.each(['\r', '\r\n', '\n'])(
    'should copy the selected row across %j line separators without separator text',
    (separator) => {
      const container = document.createElement('div')
      const target = document.createElement('div')
      target.dataset.line = '2'
      container.append(target)
      const selection = {column: 1, endLine: 2, line: 2, path: 'main.ts'}
      const result = readContextSelection({
        container,
        document: {
          lines: [],
          location: {column: 1, line: 2, path: 'main.ts'},
          revision: 'current',
          source: `first${separator}  ${separator}last`,
        },
        selection,
        target,
      })
      expect(result.selection).toEqual(selection)
      expect(result.text).toBe('  ')
    },
  )
})
