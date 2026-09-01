import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  historicalGenerationRuns,
  historicalGenerationStatusEnum,
  historicalGenerationSubmissionStateEnum,
  processedOpenAiWebhookEvents,
} from '../historical-generation-runs'

it('should expose historical generation run constraints and indexes', () => {
  const runConfig = getTableConfig(historicalGenerationRuns)

  expect(historicalGenerationStatusEnum.enumValues).toEqual([
    'preparing',
    'submitted',
    'completed',
    'failed',
    'rejected',
  ])
  expect(historicalGenerationSubmissionStateEnum.enumValues).toEqual(['unknown', 'expired'])
  expect(runConfig).toMatchObject({
    checks: [expect.any(Object)],
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object), expect.any(Object), expect.any(Object), expect.any(Object)],
  })
  expect(runConfig.foreignKeys[0]?.reference().foreignTable).toBeDefined()
  expect(getTableConfig(processedOpenAiWebhookEvents).name).toBe('processed_openai_webhook_events')
})
