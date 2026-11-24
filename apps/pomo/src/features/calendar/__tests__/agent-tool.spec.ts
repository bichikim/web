/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createCalendarToolInstruction} from '../agent-prompt'
import {executeCalendarTool, resolveCalendarToolLookup} from '../agent-tool'
import {listCalendarEvents} from '../client'

vi.mock('../client', () => ({listCalendarEvents: vi.fn()}))

const timeZone = 'Asia/Seoul'
const range = {at: '', end: '2026-09-06T00:00', name: 'calendar_lookup', start: '2026-09-05T12:00'}

it.each([
  {...range, start: '2026-09-06T00:00'},
  {...range, end: '2026-10-08T00:00'},
  {...range, start: '2026-02-30T12:00'},
  {...range, start: '2026-09-05T12:00Z'},
  {...range, at: '2026-09-05T15:00'},
  {...range, name: 'none'},
  {...range, url: 'https://example.invalid'},
])('should reject an invalid or unsupported calendar tool call', async (call) => {
  const signal = new AbortController().signal
  expect(await executeCalendarTool(call, timeZone, signal)).toBe(
    '어느 날짜와 시간대의 일정을 확인할까요?',
  )
  expect(listCalendarEvents).not.toHaveBeenCalled()
})

it('should accept a local instant in the account time zone', () => {
  expect(
    resolveCalendarToolLookup({...range, at: '2026-09-05T15:00', end: '', start: ''}, timeZone),
  ).toEqual({at: '2026-09-05T06:00:00.000Z'})
})

it('should reject a nonexistent minute during a daylight-saving transition', () => {
  expect(
    resolveCalendarToolLookup(
      {...range, end: '2026-03-08T04:00', start: '2026-03-08T02:30'},
      'America/Los_Angeles',
    ),
  ).toBeNull()
})

it.each(['04', '05', '06'])('should anchor the excluded weekend on September %s', (day) => {
  const prompt = createCalendarToolInstruction({now: `2026-09-${day}T10:30:00.000Z`, timeZone})
  expect(prompt).toContain('이번 주말은 2026-09-05 토요일부터')
  expect(prompt).toContain('다음 주말은 2026-09-12 토요일부터 2026-09-14 월요일')
})
