import {expect, it} from 'vitest'
import type {PictureDiaryEntry} from '../../../../features/picture-diary'
import {getBookPagination} from '../pagination'

const entriesFor = (count: number): ReadonlyArray<PictureDiaryEntry> =>
  Array.from({length: count}, (_, index) => ({
    createdAt: '2026-09-05T00:00:00.000Z',
    date: '2026-09-05',
    id: String(count - index),
    strokes: [],
    text: String(count - index),
    updatedAt: '2026-09-05T00:00:00.000Z',
    version: 1,
  }))

it.each([0, 2, 4])('should turn past writing to a blank and cover with %i entries', (count) => {
  const entries = entriesFor(count)
  const writing = getBookPagination({entries})
  expect(writing.newer).toEqual({left: {kind: 'blank'}, right: {kind: 'cover'}})
  const end = getBookPagination({ending: true, entries})
  expect(end.current).toEqual(writing.newer)
  expect(end.older).toEqual(writing.current)
  expect(end.newer).toBeNull()
})

it.each([0, 1, 2, 3, 4, 5])(
  'should place every entry exactly once across spreads with %i entries',
  (count) => {
    const entries = entriesFor(count)
    let pagination = getBookPagination({entries})
    const ids: Array<string> = []
    const writingSide = count % 2 === 0 ? 'right' : 'left'
    expect(pagination.current[writingSide].kind).toBe('writing')
    for (;;) {
      for (const page of [pagination.current.left, pagination.current.right]) {
        if (page.kind === 'entry') {
          ids.push(page.entry.id)
        }
      }
      if (pagination.older === null) {
        break
      }
      const page = pagination.older.right
      if (page.kind !== 'entry') {
        throw new Error('Expected older entry')
      }
      pagination = getBookPagination({entries, selectedId: page.entry.id})
    }
    expect(ids.toSorted()).toEqual(entries.map((entry) => entry.id).toSorted())
    expect(pagination.current.left.kind).toBe('cover')
  },
)

it('should put writing on the reverse of the first entry instead of repeating it', () => {
  const pagination = getBookPagination({entries: entriesFor(1), selectedId: '1'})
  expect(pagination.current.left.kind).toBe('cover')
  expect(pagination.current.right.kind).toBe('entry')
  expect(pagination.newer).toEqual({left: {kind: 'writing'}, right: {kind: 'cover'}})
})

it('should navigate one page at a time on compact screens', () => {
  const pagination = getBookPagination({compact: true, entries: entriesFor(3), selectedId: '2'})
  expect(pagination.older?.right).toMatchObject({entry: {id: '1'}, kind: 'entry'})
  expect(pagination.newer?.right).toMatchObject({entry: {id: '3'}, kind: 'entry'})
})

it.each([0, 1, 2])('should reach the final cover on compact screens with %i entries', (count) => {
  const entries = entriesFor(count)
  const writing = getBookPagination({compact: true, entries})
  expect(writing.newer?.right.kind).toBe('cover')
  const ending = getBookPagination({compact: true, ending: true, entries})
  expect(ending.current.right.kind).toBe('cover')
  expect(ending.older?.right.kind).toBe('writing')
  expect(ending.newer).toBeNull()
})
