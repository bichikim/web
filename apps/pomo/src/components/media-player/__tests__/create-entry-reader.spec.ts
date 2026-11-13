/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createEntryReader} from '../create-entry-reader'

it('should consume each track occurrence independently without changing the inputs', () => {
  const tracks = Object.freeze(['one', 'two', 'one'])
  const entryIds = Object.freeze(['one-first', 'two-first', 'one-second'])
  const takeEntryId = createEntryReader({entryIds, getTrackId: (track) => track, tracks})

  expect(takeEntryId('two')).toBe('two-first')
  expect(takeEntryId('one')).toBe('one-first')
  expect(takeEntryId('missing')).toBeUndefined()
  expect(takeEntryId('one')).toBe('one-second')
  expect(takeEntryId('one')).toBeUndefined()
  expect(takeEntryId('two')).toBeUndefined()
  expect(tracks).toEqual(['one', 'two', 'one'])
  expect(entryIds).toEqual(['one-first', 'two-first', 'one-second'])
})

it('should project object tracks into the same occurrence queues', () => {
  const takeEntryId = createEntryReader({
    entryIds: ['first', 'second'],
    getTrackId: (track) => track.id,
    tracks: [{id: 'one'}, {id: 'one'}],
  })

  expect(takeEntryId('one')).toBe('first')
  expect(takeEntryId('one')).toBe('second')
  expect(takeEntryId('one')).toBeUndefined()
})

it('should skip tracks without an aligned entry ID before projecting them', () => {
  const getTrackId = vi.fn((track: string) => track)
  const takeEntryId = createEntryReader({entryIds: [], getTrackId, tracks: ['one']})

  expect(getTrackId).not.toHaveBeenCalled()
  expect(takeEntryId('one')).toBeUndefined()
})

it('should ignore entry IDs beyond the track list', () => {
  const takeEntryId = createEntryReader({
    entryIds: ['first', 'extra'],
    getTrackId: (track) => track,
    tracks: ['one'],
  })

  expect(takeEntryId('one')).toBe('first')
  expect(takeEntryId('one')).toBeUndefined()
})

it('should preserve empty and repeated IDs without applying caller validation', () => {
  const takeEntryId = createEntryReader({
    entryIds: ['', 'same', 'same'],
    getTrackId: (track) => track,
    tracks: ['one', 'one', 'two'],
  })

  expect(takeEntryId('one')).toBe('')
  expect(takeEntryId('one')).toBe('same')
  expect(takeEntryId('two')).toBe('same')
})

it('should give each reader its own unconsumed entries', () => {
  const options = {entryIds: ['first'], getTrackId: (track: string) => track, tracks: ['one']}
  const first = createEntryReader(options)
  const second = createEntryReader(options)

  expect(first('one')).toBe('first')
  expect(first('one')).toBeUndefined()
  expect(second('one')).toBe('first')
})

it('should retain sparse track alignment', () => {
  const tracks = new Array<string>(3)
  tracks[0] = 'one'
  tracks[2] = 'one'
  const takeEntryId = createEntryReader({
    entryIds: ['first', 'unused', 'second'],
    getTrackId: (track) => track,
    tracks,
  })

  expect(takeEntryId('one')).toBe('first')
  expect(takeEntryId('one')).toBe('second')
  expect(takeEntryId('one')).toBeUndefined()
})

it('should propagate a projection failure without translating it', () => {
  const failure = new Error('Unable to read track identity')
  let caught: unknown
  try {
    createEntryReader({
      entryIds: ['entry'],
      getTrackId: () => {
        throw failure
      },
      tracks: ['one'],
    })
  } catch (error: unknown) {
    caught = error
  }

  expect(caught).toBe(failure)
})
