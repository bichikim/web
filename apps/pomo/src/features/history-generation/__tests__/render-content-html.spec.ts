import {expect, it} from 'vitest'

import type {HistoricalMomentDraft} from '../contract'
import {renderHistoryContentHtml} from '../render-content-html'

it('should escape generated prose and source labels before rendering feed HTML', () => {
  const moment: HistoricalMomentDraft = {
    eventDay: 15,
    eventMonth: 8,
    eventYear: 1945,
    historicalEra: 'ce',
    sections: {
      context: {sourceUrls: [], text: '배경 & 맥락'},
      event: {sourceUrls: [], text: '<사건>'},
      significance: {sourceUrls: [], text: '변화 "이후"'},
    },
    sources: [
      {
        publisher: '기록소 & 박물관',
        title: '<원문>',
        url: 'https://example.com/history?a=1&b=2',
      },
    ],
    summary: '요약',
    title: '제목',
  }

  expect(renderHistoryContentHtml(moment)).toBe(
    '<p>&lt;사건&gt;</p><p>배경 &amp; 맥락</p><p><strong>왜 기억할까</strong> 변화 &quot;이후&quot;</p><p><strong>출처</strong></p><ol><li><a href="https://example.com/history?a=1&amp;b=2">기록소 &amp; 박물관 — &lt;원문&gt;</a></li></ol>',
  )
})
