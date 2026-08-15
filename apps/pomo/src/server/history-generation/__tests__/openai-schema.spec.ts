import {zodTextFormat} from 'openai/helpers/zod'
import {expect, it} from 'vitest'

import {historyGenerationOutputSchema} from '../../../features/history-generation'

it('should convert the generation contract into a strict OpenAI response format', () => {
  expect(() => zodTextFormat(historyGenerationOutputSchema, 'history_generation')).not.toThrow()
  expect(zodTextFormat(historyGenerationOutputSchema, 'history_generation')).toMatchObject({
    name: 'history_generation',
    strict: true,
    type: 'json_schema',
  })
})
