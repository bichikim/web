import {expect, it} from 'vitest'
import {appendAttachment, draftAttachment} from '../pane-attachments'
import {emptyPane, followDocument} from '../pane-state'
const document = followDocument(emptyPane(), {
  location: {column: 1, line: 1, path: 'a.ts'},
  revision: 'disk',
  source: 'saved\n',
}).documents[0]
it('should capture a draft patch without modifying its saved revision', () => {
  expect(draftAttachment(document)).toBeUndefined()
  const draft = {...document, source: 'draft\n'}
  const captured = draftAttachment(draft)
  expect(captured?.patch).toContain('+draft')
  expect(captured?.attachment.text).toContain('Base revision (last read or saved): "disk"')
  expect(document.source).toBe('saved\n')
})
it('should retain existing snapshots and refuse excessive chat context', () => {
  const state = emptyPane()
  const attachment = {end: 1, path: 'a.ts', start: 1, text: 'snapshot'}
  expect(appendAttachment(state, attachment).attachments).toEqual([attachment])
  expect(state.attachments).toEqual([])
  expect(() => appendAttachment(state, {...attachment, text: '가'.repeat(30_000)})).toThrow(
    '첨부 용량',
  )
})
