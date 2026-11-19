/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../../api-json'
import {loadCalendarPromptContext} from '../client'
import type {CalendarEvent} from '../types'
import {createRangeApi} from './fixtures/range-api'
import {createEvents} from './fixtures/weekday-events'

vi.mock('../../api-json', () => ({apiJson: vi.fn()}))

const events: readonly CalendarEvent[] = createEvents({includePreviousWeek: true})

beforeEach(() => {
  vi.mocked(apiJson).mockReset()
  vi.mocked(apiJson).mockImplementation(createRangeApi(events))
})

const observe = (context: string | null) => {
  expect(apiJson).toHaveBeenCalledTimes(1)
  const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(input), 'https://fixture.invalid').searchParams
  return {
    end: search.get('end'),
    includesMonday: context?.includes('제외할 월요일 일정'),
    includesTuesdayAM: context?.includes('화요일 오전 일정'),
    includesTuesdayPM: context?.includes('화요일 오후 일정'),
    start: search.get('start'),
  }
}

const options = {now: new Date('2026-09-04T10:30:00.000Z'), timeZone: 'Asia/Seoul'}
it.each([
  ['이번 주 월요일 오전 말고 화요일 오후 일정 알려줘', '이번 주 화요일 오후 일정 알려줘'],
  ['다음 주 월요일 3시 말고 화요일 오후 일정 알려줘', '다음 주 화요일 오후 일정 알려줘'],
  ['다음 주 월요일 15:00 말고 화요일 오후 일정 알려줘', '다음 주 화요일 오후 일정 알려줘'],
])('should request and ground the canonical weekday in %s', async (text, canonical) => {
  const expected = await loadCalendarPromptContext({...options, text: canonical})
  const expectedURL = vi.mocked(apiJson).mock.calls[0]?.[0]
  vi.mocked(apiJson).mockClear()
  const actual = await loadCalendarPromptContext({...options, text})
  expect(apiJson).toHaveBeenCalledTimes(1)
  expect(vi.mocked(apiJson).mock.calls[0]?.[0]).toEqual(expectedURL)
  expect(actual).toEqual(expected)
  expect(actual).not.toContain('제외할 월요일')
  expect(actual).toContain('화요일 오후')
})

it.each([
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 말고 화요일 오후만 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-09-08T15:00:00.000Z', start: '2026-09-06T15:00:00.000Z'},
    text: '다음 주 월요일 3시 말고 화요일 오후 일정도 말고 일정 알려줘',
  },
  {
    expected: {end: '2026-10-04T10:30:00.000Z', start: '2026-09-04T10:30:00.000Z'},
    text: '이번 주 월요일 오전 말고 화요일 오후만 말고 일정 알려줘',
  },
])('should preserve the baseline request and grounding for $text', async ({expected, text}) => {
  const context = await loadCalendarPromptContext({...options, text})
  expect(apiJson).toHaveBeenCalledTimes(1)
  const [input] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(input), 'https://fixture.invalid').searchParams
  expect({end: search.get('end'), start: search.get('start')}).toEqual(expected)
  expect(context).toContain('제외할 월요일 일정')
})
