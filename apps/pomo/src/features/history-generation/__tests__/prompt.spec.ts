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

it('should constrain a regeneration to the requested stable titles', () => {
  const prompt = buildHistoryPrompt({
    policy: {
      allowedDomains: ['example.com'],
      seedUrls: ['https://example.com/history'],
      version: 'test-policy',
    },
    requiredTitles: [
      '1858년, 대서양 횡단 전신 첫 교신',
      '1896년, 유콘에서 금 발견',
      '1977년, 엘비스 프레슬리 사망',
    ],
    targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
  })

  expect(prompt).toContain('아래 3개 사건만 작성하고 다른 사건은 추가하지 않는다')
  expect(prompt).toContain('title은 아래 표기를 글자까지 정확히 유지한다')
  expect(prompt).toContain('- 1977년, 엘비스 프레슬리 사망')
})
