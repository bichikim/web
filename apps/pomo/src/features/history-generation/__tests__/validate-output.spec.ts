import {expect, it} from 'vitest'

import type {HistoryGenerationOutput, HistorySourcePolicy} from '../contract'
import {validateHistoryOutput} from '../validate-output'

const SOURCE_URLS = ['https://archive.example/a', 'https://museum.example/b'] as const
const POLICY: HistorySourcePolicy = {
  allowedDomains: ['archive.example', 'museum.example'],
  seedUrls: [],
  version: 'test-v1',
}

const createOutput = (): HistoryGenerationOutput => ({
  moments: Array.from({length: 3}, (_, index) => ({
    eventDay: 15,
    eventMonth: 8,
    eventYear: 1945 + index,
    historicalEra: 'ce',
    sections: {
      context: {
        sourceUrls: [...SOURCE_URLS],
        text: '사건이 일어나기 전의 역사적 배경과 당시의 상황을 이해하기 쉽게 설명하는 문장입니다. '
          .repeat(3)
          .trim(),
      },
      event: {
        sourceUrls: [...SOURCE_URLS],
        text: '그날 실제로 벌어진 사건과 관련 인물의 행동을 구체적으로 설명하는 문장입니다. '
          .repeat(3)
          .trim(),
      },
      significance: {
        sourceUrls: [...SOURCE_URLS],
        text: '이 사건이 이후 사회에 남긴 변화와 오늘날 기억되는 이유를 설명하는 문장입니다. '
          .repeat(3)
          .trim(),
      },
    },
    sources: [
      {publisher: '기록보관소', title: '기록 A', url: SOURCE_URLS[0]},
      {publisher: '박물관', title: '기록 B', url: SOURCE_URLS[1]},
    ],
    summary:
      '사건의 핵심 내용과 역사적 의미를 피드 목록만 읽어도 이해할 수 있도록 정확하게 설명합니다. 당시의 배경과 이후에 남긴 변화도 함께 짚어 주는 요약문입니다.',
    title: `${1945 + index}년, 역사적 사건`,
  })),
})

it('should accept grounded moments for the requested calendar date', () => {
  const output = createOutput()

  expect(
    validateHistoryOutput({
      outputText: JSON.stringify(output),
      policy: POLICY,
      searchSourceUrls: SOURCE_URLS,
      targetDay: 15,
      targetMonth: 8,
    }),
  ).toEqual(output)
})

it('should accept canonical variants of a searched source URL', () => {
  const output = createOutput()
  output.moments[0]!.sources[0]!.url = 'https://www.archive.example/a/?utm_source=openai#section'
  output.moments[0]!.sections.context.sourceUrls[0] =
    'https://www.archive.example/a/?utm_source=openai#section'

  expect(() =>
    validateHistoryOutput({
      outputText: JSON.stringify(output),
      policy: POLICY,
      searchSourceUrls: SOURCE_URLS,
      targetDay: 15,
      targetMonth: 8,
    }),
  ).not.toThrow()
})

it('should reject a URL that did not come from OpenAI web search', () => {
  const output = createOutput()
  output.moments[0]!.sources[0]!.url = 'https://archive.example/invented'

  expect(() =>
    validateHistoryOutput({
      outputText: JSON.stringify(output),
      policy: POLICY,
      searchSourceUrls: SOURCE_URLS,
      targetDay: 15,
      targetMonth: 8,
    }),
  ).toThrow('A generated source was not returned by OpenAI web search')
})

it('should reject a moment from another calendar date', () => {
  const output = createOutput()
  output.moments[0]!.eventDay = 14

  expect(() =>
    validateHistoryOutput({
      outputText: JSON.stringify(output),
      policy: POLICY,
      searchSourceUrls: SOURCE_URLS,
      targetDay: 15,
      targetMonth: 8,
    }),
  ).toThrow('A generated moment does not match the target month and day')
})
