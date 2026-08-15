import {zodTextFormat} from 'openai/helpers/zod'
import {expect, it} from 'vitest'

import {historyGenerationOpenAiOutputSchema} from 'src/features/history-generation'

it('should convert the generation contract into a strict OpenAI response format', () => {
  const format = zodTextFormat(historyGenerationOpenAiOutputSchema, 'history_generation')

  expect(format).toMatchObject({
    name: 'history_generation',
    strict: true,
    type: 'json_schema',
  })
  expect(JSON.stringify(format)).not.toContain('"format":"uri"')
})
