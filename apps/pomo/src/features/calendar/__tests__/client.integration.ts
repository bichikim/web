/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {apiJson} from '../../api-json'
import {loadCalendarPromptContext} from '../client'

vi.mock('../../api-json', () => ({apiJson: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiJson).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
})

it('should request only the current named weekday when this week is specified', async () => {
  await expect(
    loadCalendarPromptContext({
      now: new Date('2026-09-04T10:30:00.000Z'),
      text: '이번 주 금요일 일정 알려줘',
      timeZone: 'Asia/Seoul',
    }),
  ).resolves.toContain('조회 기간에 등록된 일정이 없습니다.')

  const requestUrl = new URL(String(vi.mocked(apiJson).mock.calls[0]?.[0]), 'https://pomofi.io')
  expect(requestUrl.searchParams.get('start')).toBe('2026-09-04T10:30:00.000Z')
  expect(requestUrl.searchParams.get('end')).toBe('2026-09-04T15:00:00.000Z')
  expect(requestUrl.searchParams.get('timeZone')).toBe('Asia/Seoul')
  expect(apiJson).toHaveBeenCalledOnce()
})
