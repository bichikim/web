import {describe, expect, it} from 'vitest'
import {createLineChanges, lineChange} from '../create-line-changes'

describe('createLineChanges', () => {
  it('should classify added, replaced and deleted blocks with current line anchors', () => {
    const hunks = createLineChanges('a\nb\nc\nd\ne', 'a\nB\nc\ne\nf')
    expect(hunks.map(({kind, oldStart, newStart}) => ({kind, newStart, oldStart}))).toEqual([
      {kind: 'modified', newStart: 2, oldStart: 2},
      {kind: 'deleted', newStart: 4, oldStart: 4},
      {kind: 'added', newStart: 5, oldStart: 6},
    ])
    expect(lineChange(hunks, 4)?.kind).toBe('deleted')
    expect(lineChange(hunks, 5)?.newLines).toEqual(['f'])
  })
  it('should retain a marker for deletion at the start and in an empty file', () => {
    expect(lineChange(createLineChanges('first\nlast', 'last'), 1)?.oldLines).toEqual(['first'])
    expect(lineChange(createLineChanges('only', ''), 1)?.kind).toBe('deleted')
    expect(lineChange(createLineChanges('first\nlast', 'first'), 1, 1, {lineCount: 1})?.kind).toBe(
      'deleted',
    )
  })
  it('should compare normalized line endings and retain newline-only changes', () => {
    expect(createLineChanges('one\r\ntwo', 'one\ntwo')).toEqual([])
    expect(createLineChanges('one', 'one\n')).toHaveLength(1)
  })
  it('should expose changes hidden by a collapsed range and ignore equal content', () => {
    const hunks = createLineChanges('a\nb\nc', 'a\nb\nC')
    expect(lineChange(hunks, 1, 3)?.kind).toBe('modified')
    expect(createLineChanges('same', 'same')).toEqual([])
  })
})
