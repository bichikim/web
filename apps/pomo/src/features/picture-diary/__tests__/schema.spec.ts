/** @vitest-environment jsdom */
import {describe, expect, it} from 'vitest'

import {createPictureDiaryEntry, parsePictureDiaryEntries, sortPictureDiaryEntries} from '../schema'

const ZERO_WIDTH_SPACE = '\u200b'

describe('createPictureDiaryEntry', () => {
  it('should create a trimmed entry from either writing or drawing', () => {
    expect(
      createPictureDiaryEntry({
        createdAt: '2026-09-04T03:00:00.000Z',
        date: '2026-09-04',
        id: 'entry-1',
        now: new Date('2026-09-04T04:00:00.000Z'),
        strokes: [{points: [{x: 0.25, y: 0.5}]}],
        text: '  오늘은 맑음  ',
        weather: {condition: 'clear', temperatureCelsius: 24.4},
      }),
    ).toEqual({
      createdAt: '2026-09-04T03:00:00.000Z',
      date: '2026-09-04',
      id: 'entry-1',
      strokes: [{points: [{x: 0.25, y: 0.5}]}],
      text: '오늘은 맑음',
      updatedAt: '2026-09-04T04:00:00.000Z',
      version: 1,
      weather: {condition: 'clear', temperatureCelsius: 24.4},
    })
  })

  it('should reject zero-width-space-only text when an entry has no other content', () => {
    expect(() =>
      createPictureDiaryEntry({
        createdAt: '2026-09-04T03:00:00.000Z',
        date: '2026-09-04',
        id: 'entry-zwsp',
        now: new Date('2026-09-04T04:00:00.000Z'),
        strokes: [],
        text: ZERO_WIDTH_SPACE,
      }),
    ).toThrow()
  })

  it('should preserve zero-width spaces in visible text', () => {
    const entry = createPictureDiaryEntry({
      createdAt: '2026-09-04T03:00:00.000Z',
      date: '2026-09-04',
      id: 'entry-visible-zwsp',
      now: new Date('2026-09-04T04:00:00.000Z'),
      strokes: [],
      text: `  오늘${ZERO_WIDTH_SPACE}은 맑음  `,
    })

    expect(entry.text).toBe(`오늘${ZERO_WIDTH_SPACE}은 맑음`)
  })
})

describe('parsePictureDiaryEntries', () => {
  it('should keep existing version-one entries without a weather snapshot', () => {
    expect(
      parsePictureDiaryEntries([
        {
          createdAt: '2026-09-04T03:00:00.000Z',
          date: '2026-09-04',
          id: 'entry-1',
          strokes: [],
          text: '기존 일기',
          updatedAt: '2026-09-04T03:00:00.000Z',
          version: 1,
        },
      ]),
    ).toEqual([
      {
        createdAt: '2026-09-04T03:00:00.000Z',
        date: '2026-09-04',
        id: 'entry-1',
        strokes: [],
        text: '기존 일기',
        updatedAt: '2026-09-04T03:00:00.000Z',
        version: 1,
      },
    ])
  })

  it('should reject an empty diary entry', () => {
    expect(
      parsePictureDiaryEntries([
        {
          createdAt: '2026-09-04T03:00:00.000Z',
          date: '2026-09-04',
          id: 'entry-1',
          strokes: [],
          text: '   ',
          updatedAt: '2026-09-04T03:00:00.000Z',
          version: 1,
        },
      ]),
    ).toBeNull()
  })

  it('should preserve zero-width-space-only legacy entries in a mixed snapshot', () => {
    const legacyEntry = {
      createdAt: '2026-09-03T03:00:00.000Z',
      date: '2026-09-03',
      id: 'legacy-zwsp',
      strokes: [],
      text: ZERO_WIDTH_SPACE,
      updatedAt: '2026-09-03T03:00:00.000Z',
      version: 1,
    }
    const visibleEntry = {
      createdAt: '2026-09-04T03:00:00.000Z',
      date: '2026-09-04',
      id: 'visible',
      strokes: [],
      text: '기존 일기',
      updatedAt: '2026-09-04T03:00:00.000Z',
      version: 1,
    }

    expect(parsePictureDiaryEntries([legacyEntry, visibleEntry])).toEqual([
      legacyEntry,
      visibleEntry,
    ])
  })
})

describe('sortPictureDiaryEntries', () => {
  it('should order entries by date and then creation time without dropping same-date entries', () => {
    const morningEntry = createPictureDiaryEntry({
      createdAt: '2026-09-04T01:00:00.000Z',
      date: '2026-09-04',
      id: 'morning',
      now: new Date('2026-09-04T01:00:00.000Z'),
      strokes: [],
      text: '아침',
    })
    const eveningEntry = createPictureDiaryEntry({
      createdAt: '2026-09-04T10:00:00.000Z',
      date: '2026-09-04',
      id: 'evening',
      now: new Date('2026-09-04T10:00:00.000Z'),
      strokes: [],
      text: '저녁',
    })
    const olderEntry = createPictureDiaryEntry({
      createdAt: '2026-09-03T10:00:00.000Z',
      date: '2026-09-03',
      id: 'older',
      now: new Date('2026-09-03T10:00:00.000Z'),
      strokes: [],
      text: '어제',
    })

    expect(sortPictureDiaryEntries([morningEntry, olderEntry, eveningEntry])).toEqual([
      eveningEntry,
      morningEntry,
      olderEntry,
    ])
  })
})

it('should retain a generated PNG in an image-only entry', () => {
  const image = {blob: new Blob(['png'], {type: 'image/png'}), prompt: 'A quiet day'}
  const entry = createPictureDiaryEntry({
    createdAt: '2026-09-05T03:00:00.000Z',
    date: '2026-09-05',
    id: 'image',
    image,
    now: new Date('2026-09-05T03:00:00.000Z'),
    strokes: [],
    text: '',
  })
  expect(entry.image).toEqual(image)
  expect(parsePictureDiaryEntries([entry])?.[0]?.image).toEqual(image)
})

it.each([
  {blob: 'blob:temporary', prompt: 'Scene'},
  {blob: new Blob(['svg'], {type: 'image/svg+xml'}), prompt: 'Scene'},
  {blob: new Blob([], {type: 'image/png'}), prompt: 'Scene'},
])('should reject invalid generated image data', (image) => {
  expect(
    parsePictureDiaryEntries([
      {
        createdAt: '2026-09-05T03:00:00.000Z',
        date: '2026-09-05',
        id: 'image',
        image,
        strokes: [],
        text: 'Diary',
        updatedAt: '2026-09-05T03:00:00.000Z',
        version: 1,
      },
    ]),
  ).toBeNull()
})

it('should retain drawing tools when saving a diary', () => {
  const strokes = [{color: 'blue', points: [{x: 0.5, y: 0.5}], thickness: 'thick'}] as const
  const entry = createPictureDiaryEntry({
    createdAt: '2026-09-06T00:00:00.000Z',
    date: '2026-09-06',
    id: 'colored',
    now: new Date('2026-09-06T00:00:00.000Z'),
    strokes,
    text: '',
  })
  expect(parsePictureDiaryEntries([entry])?.[0]?.strokes).toEqual(strokes)
})
