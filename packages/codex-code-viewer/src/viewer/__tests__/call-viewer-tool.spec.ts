import {describe, expect, it, vi} from 'vitest'
import {z} from 'zod'
import {documentSchema} from '../../shared/contracts'
import {callViewerTool} from '../call-viewer-tool'

describe('callViewerTool', () => {
  it('should load a deferred code.read document before returning it', async () => {
    const document = {
      lineCount: 1,
      lines: [],
      location: {column: 1, line: 1, path: 'large.txt'},
      readOnly: true,
      revision: 'v1',
      source: '',
      sourceLength: 3,
    }
    const call = vi.fn(async (name) => ({
      content: [],
      structuredContent: name === 'code.read' ? {document} : {data: 'abc', next: 3},
    }))
    const result = await callViewerTool({
      input: {session: 's'},
      name: 'code.read',
      port: {call},
      schema: z.object({document: documentSchema}),
    })
    expect(result.document.source).toBe('abc')
    expect(call).toHaveBeenCalledWith('code.source', {
      offset: 0,
      path: 'large.txt',
      revision: 'v1',
      session: 's',
    })
  })
})
