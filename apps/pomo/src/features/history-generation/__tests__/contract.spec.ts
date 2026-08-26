import {expect, it} from 'vitest'

import {
  historicalMomentDraftSchema,
  historyGenerationOpenAiOutputSchema,
  historyGenerationOutputSchema,
  historySectionSchema,
  historySourceSchema,
} from '../contract'

const repeat = (value: string, length: number) => value.repeat(length)
const createMoment = (sectionLength = 100) => ({
  eventDay: 15,
  eventMonth: 8,
  eventYear: 1945,
  historicalEra: 'ce',
  sections: {
    context: {
      sourceUrls: ['https://a.example/1', 'https://b.example/1'],
      text: repeat('가', sectionLength),
    },
    event: {
      sourceUrls: ['https://a.example/2', 'https://b.example/2'],
      text: repeat('나', sectionLength),
    },
    significance: {
      sourceUrls: ['https://a.example/3', 'https://b.example/3'],
      text: repeat('다', sectionLength),
    },
  },
  sources: [
    {publisher: 'A', title: '자료 A', url: 'https://a.example/source'},
    {publisher: 'B', title: '자료 B', url: 'https://b.example/source'},
  ],
  summary: repeat('요', 80),
  title: '광복',
})

it('should parse final and OpenAI history generation contracts', () => {
  const moments = [createMoment(), createMoment(), createMoment()]

  expect(historyGenerationOutputSchema.parse({moments}).moments).toHaveLength(3)
  expect(historyGenerationOpenAiOutputSchema.parse({moments}).moments).toHaveLength(3)
  expect(historicalMomentDraftSchema.parse(createMoment()).title).toBe('광복')
  expect(historySectionSchema.parse(createMoment().sections.context).text).toHaveLength(100)
  expect(historySourceSchema.parse(createMoment().sources[0]).publisher).toBe('A')
})

it.each([50, 200])('should reject a combined body outside its length range', (sectionLength) => {
  expect(() => historicalMomentDraftSchema.parse(createMoment(sectionLength))).toThrow(
    'The combined section length must be between 250 and 500 characters',
  )
})
