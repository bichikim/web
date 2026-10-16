import {describe, expect, it} from 'vitest'
import {success} from '../../shared/contracts'
import {toolResult} from '../tool-result'

describe('toolResult', () => {
  it('should expose readonly source metadata without transferring the full document', () => {
    const document = {
      lineCount: 1,
      lines: [],
      location: {column: 1, line: 1, path: 'large.ts'},
      readOnly: true,
      revision: 'v1',
      source: 'large source',
    }
    expect(toolResult(success({document, session: 's'}))).toMatchObject({
      structuredContent: {document: {readOnly: true, source: '', sourceLength: 12}, session: 's'},
    })
    expect(document.source).toBe('large source')
  })
  it('should retain highlighted small source inline', () => {
    expect(toolResult(success({document: {lines: [], source: 'small'}}))).toMatchObject({
      structuredContent: {document: {source: 'small'}},
    })
  })
})
