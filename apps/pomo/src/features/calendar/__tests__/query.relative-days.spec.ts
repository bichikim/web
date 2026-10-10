import {describe, expect, it} from 'vitest'

import {createCalendarQuery} from '../query'

describe('createCalendarQuery relative days', () => {
  const now = new Date('2026-09-04T10:30:00.000Z')

  it.each([
    {
      expected: {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'},
      phrase: '그저께',
      queryKind: 'explicit schedule query',
      text: '그저께 일정 알려줘',
    },
    {
      expected: {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'},
      phrase: '그저께',
      queryKind: 'implicit schedule question',
      text: '그저께 뭐 있었어?',
    },
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      phrase: '글피',
      queryKind: 'explicit schedule query',
      text: '글피 일정 알려줘',
    },
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      phrase: '글피',
      queryKind: 'implicit schedule question',
      text: '글피 뭐 있어?',
    },
  ])('should query the exact local day for a $queryKind using $phrase', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })

  it.each(['낼 일정 알려줘', '낼 뭐 있어?', '낼은 뭐 있어?', '낼에 무슨 일 있어?'])(
    'should query tomorrow for the 낼 synonym in "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
        end: '2026-09-05T15:00:00.000Z',
        start: '2026-09-04T15:00:00.000Z',
      })
    },
  )

  it.each([
    ['낼 오후 일정 알려줘', '내일 오후 일정 알려줘'],
    ['낼 오후 뭐 있어?', '내일 오후 뭐 있어?'],
    ['오늘과 낼 일정 알려줘', '오늘과 내일 일정 알려줘'],
    ['오늘 말고 낼 일정 알려줘', '오늘 말고 내일 일정 알려줘'],
    ['낼 말고 오늘 일정 알려줘', '내일 말고 오늘 일정 알려줘'],
    ['어제 말고 낼 일정 알려줘', '어제 말고 내일 일정 알려줘'],
    ['모레 말고 낼 일정 알려줘', '모레 말고 내일 일정 알려줘'],
    ['글피 말고 낼 일정 알려줘', '글피 말고 내일 일정 알려줘'],
    ['그제 말고 낼 일정 알려줘', '그제 말고 내일 일정 알려줘'],
  ])('should preserve dayparts and exclusions in "%s"', (text, fullText) => {
    const expected = createCalendarQuery({now, text: fullText, timeZone: 'Asia/Seoul'})
    expect(expected).not.toBeNull()
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })

  it.each([
    '약속을 낼로 옮긴 일정 알려줘',
    '회의를 낼에 잡았는데 일정 알려줘',
    '일정을 낼부터 알려줘',
  ])('should recognize a date particle after 낼 despite a preceding object in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-05T15:00:00.000Z',
      start: '2026-09-04T15:00:00.000Z',
    })
  })

  it.each([
    '돈을 낼 일정 알려줘',
    '서류를 낼 일정 알려줘',
    '돈을   낼 일정 알려줘',
    '보낼 일정 알려줘',
    '낼름 일정 알려줘',
  ])('should keep the default window for a non-date use of 낼 in "%s"', (text) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-10-04T10:30:00.000Z',
      start: '2026-09-04T10:30:00.000Z',
    })
  })

  it('should not recognize an implicit question containing an embedded 낼', () => {
    expect(createCalendarQuery({now, text: '보낼 뭐 있어?', timeZone: 'Asia/Seoul'})).toBeNull()
  })

  it.each(['그제', '어제', '오늘', '모레', '글피'])(
    'should exclude %s when an embedded 낼 appears before the exclusion',
    (day) => {
      expect(
        createCalendarQuery({
          now,
          text: `${day} 보낼 일정 말고 내일 일정 알려줘`,
          timeZone: 'Asia/Seoul',
        }),
      ).toEqual({
        end: '2026-09-05T15:00:00.000Z',
        start: '2026-09-04T15:00:00.000Z',
      })
    },
  )

  it.each(['오늘 낼름 말고 내일 일정 알려줘', '오늘 돈을 낼 일정 말고 내일 일정 알려줘'])(
    'should preserve exclusions around a non-date 낼 in "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
        end: '2026-09-05T15:00:00.000Z',
        start: '2026-09-04T15:00:00.000Z',
      })
    },
  )

  it('should query two days ago for the 그제 synonym', () => {
    expect(createCalendarQuery({now, text: '그제 일정 알려줘', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-02T15:00:00.000Z',
      start: '2026-09-01T15:00:00.000Z',
    })
  })

  it('should recognize 그제 in an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '그제 뭐 있었어?', timeZone: 'Asia/Seoul'})).toEqual({
      end: '2026-09-02T15:00:00.000Z',
      start: '2026-09-01T15:00:00.000Z',
    })
  })

  it.each(['재그제작 일정 알려줘', '어제품 일정 알려줘'])(
    'should keep the default calendar window for a relative-day substring inside "%s"',
    (text) => {
      expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({
        end: '2026-10-04T10:30:00.000Z',
        start: '2026-09-04T10:30:00.000Z',
      })
    },
  )

  it('should not read an embedded relative day as an implicit schedule question', () => {
    expect(createCalendarQuery({now, text: '백어제는 뭐 있어?', timeZone: 'Asia/Seoul'})).toBeNull()
  })

  it.each([
    ['어제는 일정 알려줘', '2026-09-03T15:00:00.000Z', '2026-09-02T15:00:00.000Z'],
    ['어제의 일정 알려줘', '2026-09-03T15:00:00.000Z', '2026-09-02T15:00:00.000Z'],
    ['그제부터 일정 알려줘', '2026-09-02T15:00:00.000Z', '2026-09-01T15:00:00.000Z'],
    ['엊그제도 일정 알려줘', '2026-09-02T15:00:00.000Z', '2026-09-01T15:00:00.000Z'],
  ])('should recognize a relative day followed by a particle in "%s"', (text, end, start) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({end, start})
  })

  it.each([
    ['오늘과 내일 일정 알려줘', '2026-09-05T15:00:00.000Z', '2026-09-04T10:30:00.000Z'],
    ['어제와 오늘 일정 알려줘', '2026-09-04T15:00:00.000Z', '2026-09-02T15:00:00.000Z'],
    ['내일하고 오늘 일정 알려줘', '2026-09-05T15:00:00.000Z', '2026-09-04T10:30:00.000Z'],
    ['모레랑 내일 일정 알려줘', '2026-09-06T15:00:00.000Z', '2026-09-04T15:00:00.000Z'],
    ['오늘이랑 내일 일정 알려줘', '2026-09-05T15:00:00.000Z', '2026-09-04T10:30:00.000Z'],
  ])('should include relative days joined by a conjunction in "%s"', (text, end, start) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual({end, start})
  })

  it('should still exclude a conjunction-joined relative day when requested', () => {
    expect(
      createCalendarQuery({
        now,
        text: '오늘과 내일은 빼고 일정 알려줘',
        timeZone: 'Asia/Seoul',
      }),
    ).toEqual({end: '2026-09-04T15:00:00.000Z', start: '2026-09-04T10:30:00.000Z'})
  })

  it.each([
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      text: '그제 말고 글피 일정 알려줘',
    },
    {
      expected: {end: '2026-09-02T15:00:00.000Z', start: '2026-09-01T15:00:00.000Z'},
      text: '글피 말고 그제 일정 알려줘',
    },
    {
      expected: {end: '2026-09-07T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
      text: '글피 그제 말고 일정 알려줘',
    },
  ])('should query the included relative day in "$text"', ({expected, text}) => {
    expect(createCalendarQuery({now, text, timeZone: 'Asia/Seoul'})).toEqual(expected)
  })
})
