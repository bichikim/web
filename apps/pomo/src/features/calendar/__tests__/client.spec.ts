import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../../api-json'
import {listCalendarEvents, loadCalendarPromptContext} from '../client'

vi.mock('../../api-json', () => ({apiJson: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('should load a requested calendar range for calendar views', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    unavailableConnections: 0,
  })

  await expect(
    listCalendarEvents({
      end: '2026-09-30T15:00:00.000Z',
      start: '2026-08-31T15:00:00.000Z',
      timeZone: 'Asia/Seoul',
    }),
  ).resolves.toEqual({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    unavailableConnections: 0,
  })
  const [requestUrl, requestOptions] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(requestUrl), 'https://pomofi.io').searchParams

  expect(search.get('start')).toBe('2026-08-31T15:00:00.000Z')
  expect(search.get('end')).toBe('2026-09-30T15:00:00.000Z')
  expect(search.get('timeZone')).toBe('Asia/Seoul')
  expect(requestOptions).toEqual(expect.objectContaining({responseSchema: expect.any(Object)}))
})

it('should skip the API for a question without calendar intent', async () => {
  await expect(
    loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '오늘 날씨 알려줘',
      timeZone: 'Asia/Seoul',
      timeZoneOffsetMinutes: 540,
    }),
  ).resolves.toBeNull()
  expect(apiJson).not.toHaveBeenCalled()
})

it('should fetch only the resolved range and create grounded prompt context', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    unavailableConnections: 0,
  })

  await expect(
    loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '오늘 일정 알려줘',
      timeZone: 'Asia/Seoul',
      timeZoneOffsetMinutes: 540,
    }),
  ).resolves.toContain('조회 기간에 등록된 일정이 없습니다.')
  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('start')).toBe('2026-09-04T10:30:00.000Z')
  expect(requestUrl.searchParams.get('end')).toBe('2026-09-04T15:00:00.000Z')
  expect(requestUrl.searchParams.get('timeZone')).toBe('Asia/Seoul')
})

it('should tell the model when no calendar is connected', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 0,
    events: [],
    timeZone: 'Asia/Seoul',
    unavailableConnections: 0,
  })

  await expect(
    loadCalendarPromptContext({text: '다음 미팅 언제야?', timeZone: 'Asia/Seoul'}),
  ).resolves.toBe(
    '연결된 캘린더가 없습니다. 일정이 없다고 답하지 말고 캘린더 연결이 필요하다고 안내하세요.',
  )
})

it('should bound calendar events added to the local-model prompt', async () => {
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: Array.from({length: 41}, (_, index) => ({
      accountLabel: 'person@example.com',
      allDay: true,
      calendarLabel: '업무',
      end: '2026-09-06',
      id: `event-${index}`,
      provider: 'google',
      start: '2026-09-05',
      title: `일정 ${index}`,
    })),
    timeZone: 'Asia/Seoul',
    unavailableConnections: 0,
  })

  const context = await loadCalendarPromptContext({
    text: '다음 일정 알려줘',
    timeZone: 'Asia/Seoul',
  })

  expect(context).toContain('일정 39')
  expect(context).not.toContain('일정 40')
})
