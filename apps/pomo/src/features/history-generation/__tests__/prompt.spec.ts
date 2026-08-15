import {expect, it} from 'vitest'

import {buildHistoryPrompt, HISTORY_PROMPT_VERSION} from '../prompt'

it('should request a cohesive radio script without spoken section labels', () => {
  const prompt = buildHistoryPrompt({
    policy: {
      allowedDomains: ['example.com'],
      seedUrls: ['https://example.com/history'],
      version: 'test-policy',
    },
    targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
  })

  expect(HISTORY_PROMPT_VERSION).toBe('today-in-history-v2-radio')
  expect(prompt).toContain('한국어 라디오 작가')
  expect(prompt).toContain('화면을 보지 않는 청취자')
  expect(prompt).toContain('하나의 이야기처럼 자연스럽게 이어 쓴다')
  expect(prompt).toContain('"왜 기억할까", "의의:", "배경:" 같은 소제목이나 표지를 넣지 않는다')
})
