/** @vitest-environment jsdom */
import {describe, expect, it} from 'vitest'

import {createPictureDiaryEntry, parsePictureDiaryEntries} from 'src/features/picture-diary/schema'

const ZERO_WIDTH_SPACE = '\u200b'

describe('picture diary empty text edges', () => {
  it('should reject a zero-width-space-only text entry like whitespace-only text', () => {
    expect(
      parsePictureDiaryEntries([
        {
          createdAt: '2026-09-04T03:00:00.000Z',
          date: '2026-09-04',
          id: 'entry-zwsp',
          strokes: [],
          text: ZERO_WIDTH_SPACE,
          updatedAt: '2026-09-04T03:00:00.000Z',
          version: 1,
        },
      ]),
    ).toBeNull()
  })

  it('should reject creating an entry whose trimmed text is only zero-width spaces', () => {
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
})
