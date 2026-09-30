/** @vitest-environment node */
import {expect, it} from 'vitest'

import type {HistoryGenerationOutput} from '../features/history-generation/contract'
import {validateHistoryOutput} from '../features/history-generation/validate-output'

const UN_UDHR = 'https://www.un.org/en/ga/search/view_doc.asp?symbol=A/RES/217(III)'
const UN_GENOCIDE = 'https://www.un.org/en/ga/search/view_doc.asp?symbol=A/RES/260(III)'
const UNESCO = 'https://www.unesco.org/en/articles/human-rights'

const createOutput = (): HistoryGenerationOutput => ({
  moments: Array.from({length: 3}, (_, index) => ({
    eventDay: 10,
    eventMonth: 12,
    eventYear: 1948 + index,
    historicalEra: 'ce',
    sections: {
      context: {sourceUrls: [UN_UDHR, UNESCO], text: '가'.repeat(100)},
      event: {sourceUrls: [UN_UDHR, UNESCO], text: '가'.repeat(100)},
      significance: {sourceUrls: [UN_UDHR, UNESCO], text: '가'.repeat(100)},
    },
    sources: [
      {publisher: 'UN', title: 'UDHR', url: UN_UDHR},
      {publisher: 'UNESCO', title: 'Human rights', url: UNESCO},
    ],
    summary: '가'.repeat(80),
    title: `${1948 + index}년, 사건`,
  })),
})

it('should keep the cited document when two searched URLs differ only by query', () => {
  const validated = validateHistoryOutput({
    outputText: JSON.stringify(createOutput()),
    policy: {allowedDomains: ['un.org', 'unesco.org'], seedUrls: [], version: 'test'},
    searchSourceUrls: [UN_UDHR, UN_GENOCIDE, UNESCO],
    targetDay: 10,
    targetMonth: 12,
  })

  expect(validated.moments[0]!.sources[0]!.url).toBe(UN_UDHR)
})
