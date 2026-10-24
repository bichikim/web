/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {AI_MODEL_CATALOG, getAiModel, isAiModelProductionEnabled} from '../model-catalog'

describe('AI model catalog', () => {
  it('keeps every local model explicit and unverified until runner evidence exists', () => {
    expect(AI_MODEL_CATALOG).toHaveLength(14)
    expect(AI_MODEL_CATALOG.filter((model) => model.runner === 'local-runner')).toHaveLength(13)
    expect(
      AI_MODEL_CATALOG.filter((model) => model.runner === 'local-runner').every(
        (model) => model.verificationStatus === 'cataloged-unverified',
      ),
    ).toBe(true)
    expect(getAiModel('gpt-5.6-luna')).toMatchObject({
      capability: 'text',
      runner: 'openai',
      verificationStatus: 'service-configured',
    })
    expect(isAiModelProductionEnabled(getAiModel('gpt-5.6-luna')!)).toBe(true)
    expect(isAiModelProductionEnabled(getAiModel('gemma-4-e2b')!)).toBe(false)
  })
})
