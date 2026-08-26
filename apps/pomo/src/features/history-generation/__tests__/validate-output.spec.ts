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

const validate = (
  output: HistoryGenerationOutput,
  overrides: Partial<Parameters<typeof validateHistoryOutput>[0]> = {},
) =>
  validateHistoryOutput({
    outputText: JSON.stringify(output),
    policy: POLICY,
    searchSourceUrls: SOURCE_URLS,
    targetDay: 15,
    targetMonth: 8,
    ...overrides,
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

it('should replace a mistyped article slug when its source ID uniquely matches', () => {
  const output = createOutput()
  const searchedUrl =
    'https://www.archive.example/history/verified-article-title-180983782/?utm_source=openai'
  const generatedUrl = 'https://archive.example/history/mistyped-title-180983782'
  output.moments[0]!.sources[0]!.url = generatedUrl

  for (const section of Object.values(output.moments[0]!.sections)) {
    section.sourceUrls[0] = generatedUrl
  }

  const result = validateHistoryOutput({
    outputText: JSON.stringify(output),
    policy: POLICY,
    searchSourceUrls: [searchedUrl, ...SOURCE_URLS],
    targetDay: 15,
    targetMonth: 8,
  })

  expect(result.moments[0]!.sources[0]!.url).toBe(searchedUrl)
  expect(result.moments[0]!.sections.context.sourceUrls[0]).toBe(searchedUrl)
})

it('should reject an unsearched document beneath a configured seed URL', () => {
  const output = createOutput()
  const trustedUrl = 'https://archive.example/on-this-day/august-15/verified-event'
  output.moments[0]!.sources[0]!.url = trustedUrl

  for (const section of Object.values(output.moments[0]!.sections)) {
    section.sourceUrls[0] = trustedUrl
  }

  expect(() =>
    validateHistoryOutput({
      outputText: JSON.stringify(output),
      policy: {...POLICY, seedUrls: ['https://archive.example/on-this-day']},
      searchSourceUrls: SOURCE_URLS,
      targetDay: 15,
      targetMonth: 8,
    }),
  ).toThrow('A generated source was not returned by OpenAI web search')
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

it('should reject a selected regeneration that changes a required title', () => {
  const output = createOutput()
  const requiredTitles = output.moments.map((moment) => moment.title)
  output.moments[0]!.title = '1945년, 다른 역사적 사건'

  expect(() =>
    validateHistoryOutput({
      outputText: JSON.stringify(output),
      policy: POLICY,
      requiredTitles,
      searchSourceUrls: SOURCE_URLS,
      targetDay: 15,
      targetMonth: 8,
    }),
  ).toThrow('Generated moments do not match the required titles')
})

it('should accept normalized required titles and reject a different title count', () => {
  const output = createOutput()
  const requiredTitles = output.moments.map((moment) => `  ${moment.title.toUpperCase()}  `)

  expect(() => validate(output, {requiredTitles})).not.toThrow()
  expect(() => validate(output, {requiredTitles: requiredTitles.slice(1)})).toThrow(
    'Generated moments do not match the required titles',
  )
})

it('should reject duplicate moments after title normalization', () => {
  const output = createOutput()
  output.moments[1]!.eventYear = output.moments[0]!.eventYear
  output.moments[1]!.title = `  ${output.moments[0]!.title.toUpperCase()}  `

  expect(() => validate(output)).toThrow('The generated output contains a duplicate moment')
})

it('should reject an ambiguous article identity from search', () => {
  const output = createOutput()
  const generatedUrl = 'https://archive.example/history/generated-180983782'
  output.moments[0]!.sources[0]!.url = generatedUrl
  const searchSourceUrls = [
    'https://archive.example/history/first-180983782',
    'https://archive.example/history/second-180983782',
    ...SOURCE_URLS,
  ]

  expect(() => validate(output, {searchSourceUrls})).toThrow(
    'A generated source was not returned by OpenAI web search',
  )
})

it('should accept searched source URLs at the domain root', () => {
  const output = createOutput()
  const rootSources = ['https://archive.example/', 'https://museum.example/']
  output.moments[0]!.sources = [
    {publisher: '기록보관소', title: '기록 A', url: rootSources[0]!},
    {publisher: '박물관', title: '기록 B', url: rootSources[1]!},
  ]
  for (const section of Object.values(output.moments[0]!.sections)) {
    section.sourceUrls = [...rootSources]
  }

  expect(() => validate(output, {searchSourceUrls: [...SOURCE_URLS, ...rootSources]})).not.toThrow()
})

it('should require two publishers for every moment', () => {
  const output = createOutput()
  const secondArchiveUrl = 'https://archive.example/c'
  output.moments[0]!.sources[1] = {
    publisher: '기록보관소',
    title: '기록 C',
    url: secondArchiveUrl,
  }
  for (const section of Object.values(output.moments[0]!.sections)) {
    section.sourceUrls = [SOURCE_URLS[0], secondArchiveUrl]
  }

  expect(() => validate(output, {searchSourceUrls: [...SOURCE_URLS, secondArchiveUrl]})).toThrow(
    'A generated moment must cite at least two publishers',
  )
})

it('should reject a searched source from a disallowed domain', () => {
  const output = createOutput()
  const disallowedUrl = 'https://untrusted.example/c'
  output.moments[0]!.sources[0]!.url = disallowedUrl
  for (const section of Object.values(output.moments[0]!.sections)) {
    section.sourceUrls[0] = disallowedUrl
  }

  expect(() => validate(output, {searchSourceUrls: [...SOURCE_URLS, disallowedUrl]})).toThrow(
    'A generated source uses a disallowed domain: untrusted.example',
  )
})

it('should require every section URL in the moment source list', () => {
  const output = createOutput()
  const extraUrl = 'https://museum.example/extra'
  output.moments[0]!.sections.context.sourceUrls[1] = extraUrl

  expect(() => validate(output, {searchSourceUrls: [...SOURCE_URLS, extraUrl]})).toThrow(
    'A section cites a URL missing from the moment source list',
  )
})

it('should require two publishers in every section', () => {
  const output = createOutput()
  const secondArchiveUrl = 'https://archive.example/c'
  output.moments[0]!.sources.push({
    publisher: '기록보관소',
    title: '기록 C',
    url: secondArchiveUrl,
  })
  output.moments[0]!.sections.context.sourceUrls = [SOURCE_URLS[0], secondArchiveUrl]

  expect(() => validate(output, {searchSourceUrls: [...SOURCE_URLS, secondArchiveUrl]})).toThrow(
    'Each generated section must cite at least two publishers',
  )
})
