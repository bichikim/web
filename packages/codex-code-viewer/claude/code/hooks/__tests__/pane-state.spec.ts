import {expect, it} from 'vitest'
import {
  attachRange,
  changeLine,
  emptyPane,
  followDocument,
  redoEdit,
  removePaneEntry,
  replacePaneLine,
  restorePane,
  undoEdit,
} from '../pane-state'

const document = followDocument(emptyPane(), {
  location: {column: 1, line: 1, path: 'a.ts'},
  revision: 'original',
  source: 'first\r\nsecond\r\n',
}).documents[0]

it('should edit, insert and remove lines while retaining untouched CRLF endings', () => {
  const changed = changeLine(document, 'replace', 'edited')
  expect(changed.source).toBe('edited\r\nsecond\r\n')
  const inserted = changeLine(changed, 'insert')
  expect(inserted.source).toBe('edited\r\n\r\nsecond\r\n')
  expect(inserted.line).toBe(2)
  expect(changeLine(inserted, 'remove').source).toBe(changed.source)
})

it('should retain a snapshot after later edits and reject invalid or oversized attachments', () => {
  const state = {...emptyPane(), active: document.path, documents: [document]}
  const draft = changeLine(document, 'replace', 'snapshot')
  const attached = attachRange(state, draft, 2)
  expect(attached?.attachments[0].text).toContain('snapshot\r\nsecond\r')
  expect(changeLine(draft, 'replace', 'later').source).toContain('later')
  expect(attached?.attachments[0].text).not.toContain('later')
  expect(attachRange(state, draft, 0)).toBeUndefined()
  expect(attachRange(state, {...draft, source: '가'.repeat(30_000)}, 1)).toBeUndefined()
})

it('should restore valid drafts and refuse invalid active files or line numbers', () => {
  const state = {...emptyPane(), active: document.path, documents: [document]}
  expect(restorePane(JSON.parse(JSON.stringify(state)))).toEqual(state)
  expect(restorePane({...state, active: 'missing.ts'})).toBeUndefined()
  expect(restorePane({...state, documents: [{...document, line: 99}]})).toBeUndefined()
})

it('should retain a dirty base on external changes and release clean file contents when following', () => {
  const draft = changeLine(document, 'replace', 'draft')
  const state = {...emptyPane(), active: document.path, documents: [draft]}
  const followed = followDocument(state, {
    location: {column: 1, line: 1, path: 'a.ts'},
    revision: 'external',
    source: 'changed',
  })
  expect(followed.documents[0]).toMatchObject({
    base: document.source,
    conflict: true,
    revision: 'original',
    source: draft.source,
  })
  const clean = followDocument(emptyPane(), {
    location: {column: 1, line: 1, path: 'b.ts'},
    revision: 'b',
    source: 'clean',
  })
  expect(
    followDocument(clean, {
      location: {column: 1, line: 1, path: 'c.ts'},
      revision: 'c',
      source: 'next',
    }).documents.map((entry) => entry.path),
  ).toEqual(['c.ts'])
})

it('should undo and redo edits without replacing the saved baseline', () => {
  const first = changeLine(document, 'replace', 'first edit')
  const second = changeLine(first, 'replace', 'second edit')
  const undone = undoEdit(second)
  expect(undone.source).toBe(first.source)
  expect(redoEdit(undone).source).toBe(second.source)
  expect(undone.base).toBe(document.base)
})

it('should capture exact columns across CRLF lines and reject reversed ranges', () => {
  const state = {...emptyPane(), active: document.path, documents: [document]}
  expect(attachRange(state, document, 2, {end: 4, start: 3})?.attachments[0].text).toContain(
    '\nrst\r\nsec',
  )
  expect(attachRange(state, document, 1, {end: 2, start: 3})).toBeUndefined()
  expect(attachRange(state, document, 2, {end: 99, start: 1})).toBeUndefined()
})

it('should retain snapshots and sibling paths when removing cached descendants', () => {
  const state = {
    ...emptyPane(),
    active: 'src/a.ts',
    attachments: [{end: 1, path: 'src/a.ts', start: 1, text: 'snapshot'}],
    documents: [
      {...document, path: 'src/a.ts'},
      {...document, path: 'src-other/a.ts'},
    ],
  }
  const changed = removePaneEntry(state, 'src')
  expect(changed.active).toBe('')
  expect(changed.documents.map((entry) => entry.path)).toEqual(['src-other/a.ts'])
  expect(changed.attachments).toBe(state.attachments)
})

it('should ignore unchanged line input and retain undo history for a replacement', () => {
  const state = {...emptyPane(), active: document.path, documents: [document]}
  expect(replacePaneLine(state, 'a.ts', 1, 'first')).toBe(state)
  expect(replacePaneLine(state, 'a.ts', 99, 'missing')).toBe(state)
  const changed = replacePaneLine(state, 'a.ts', 2, 'changed')
  expect(changed.documents[0].source).toBe('first\r\nchanged\r\n')
  expect(undoEdit(changed.documents[0]).source).toBe(document.source)
})
