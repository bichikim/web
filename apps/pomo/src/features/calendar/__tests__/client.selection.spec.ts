/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../../api-json'
import {loadCalendarPromptContext} from '../client'

vi.mock('../../api-json', () => ({apiJson: vi.fn()}))

beforeEach(() => {
  vi.mocked(apiJson).mockReset()
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
})

it.each([
  {
    end: '2026-09-05T15:00:00.000Z',
    start: '2026-09-05T03:00:00.000Z',
    text: '내일 오전 말고 오후 일정 알려줘',
  },
  {
    end: '2026-09-05T12:00:00.000Z',
    start: '2026-09-05T09:00:00.000Z',
    text: '내일 오전 말고 저녁 일정 알려줘',
  },
  {
    end: '2026-09-05T03:00:00.000Z',
    start: '2026-09-04T15:00:00.000Z',
    text: '내일 오후 말고 오전 일정 알려줘',
  },
  {
    end: '2026-09-05T12:00:00.000Z',
    start: '2026-09-05T09:00:00.000Z',
    text: '내일 점심 말고 저녁 일정 알려줘',
  },
  {
    end: '2026-09-03T15:00:00.000Z',
    start: '2026-09-02T15:00:00.000Z',
    text: '어제 뭐 했어요?',
  },
  {
    end: '2026-09-04T15:00:00.000Z',
    start: '2026-09-04T10:30:00.000Z',
    text: '오늘 뭐 했어?',
  },
  {
    end: '2026-11-30T15:00:00.000Z',
    start: '2026-10-31T15:00:00.000Z',
    text: '다다음달 일정 알려줘',
  },
  {
    end: '2026-09-20T15:00:00.000Z',
    start: '2026-09-18T15:00:00.000Z',
    text: '다다음주말 일정 알려줘',
  },
  {
    end: '2026-09-05T15:00:00.000Z',
    start: '2026-09-05T03:00:00.000Z',
    text: '오전 말고 오후 내일 일정 알려줘',
  },
  {
    end: '2026-07-31T15:00:00.000Z',
    start: '2026-06-30T15:00:00.000Z',
    text: '지지난달 일정 알려줘',
  },
  {
    end: '2026-07-31T15:00:00.000Z',
    start: '2026-06-30T15:00:00.000Z',
    text: '지지난 달 뭐 있어?',
  },
])('should request only the selected range for $text', async ({end, start, text}) => {
  await loadCalendarPromptContext({
    now: new Date('2026-09-04T10:30:00.000Z'),
    text,
    timeZone: 'Asia/Seoul',
  })
  expect(apiJson).toHaveBeenCalledTimes(1)
  const [url] = vi.mocked(apiJson).mock.calls[0] ?? []
  const search = new URL(String(url), 'https://fixture.invalid').searchParams
  expect(Object.fromEntries(search)).toEqual({end, start, timeZone: 'Asia/Seoul'})
})

it.each(['오늘 뉴스 뭐 했어?', '어제 날씨 뭐 했어요?', '내일 오전 말고 저녁 뭐 있어?'])(
  'should not request events for a non-calendar question in %s',
  async (text) => {
    await expect(
      loadCalendarPromptContext({
        now: new Date('2026-09-04T10:30:00.000Z'),
        text,
        timeZone: 'Asia/Seoul',
      }),
    ).resolves.toBeNull()
    expect(apiJson).not.toHaveBeenCalled()
  },
)
