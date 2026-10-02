/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../features/api-json'
import {loadCalendarPromptContext} from '../features/calendar/client'

vi.mock('../features/api-json', () => ({apiJson: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('should not claim zero registered events when the remaining daypart window has already ended', async () => {
  vi.mocked(apiJson).mockResolvedValue({connections: [{id: 'work'}]})

  const context = await loadCalendarPromptContext({
    now: new Date('2026-09-04T12:30:00.000Z'),
    text: '오늘 저녁 남은 일정 알려줘',
    timeZone: 'Asia/Seoul',
  })

  expect(apiJson).toHaveBeenCalledOnce()
  expect(context).not.toContain('조회 기간에 등록된 일정이 없습니다.')
})
