import {describe, expect, it} from 'vitest'

import {createPictureDiaryEntry, parsePictureDiaryEntries, sortPictureDiaryEntries} from '../schema'

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
