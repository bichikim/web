import {describe, expect, it} from 'vitest'

import {
  getOpenAiConfiguration,
  getOpenAiWebhookSecret,
  OPENAI_REASONING_EFFORTS,
  OPENAI_SERVICE_TIERS,
} from '../environment'

const REQUIRED_ENVIRONMENT = {
  OPENAI_API_KEY: 'sk-test-secret',
}

describe('getOpenAiConfiguration', () => {
  it('should parse and trim explicit generation settings', () => {
    expect(
      getOpenAiConfiguration({
        OPENAI_API_KEY: '  sk-test-secret  ',
        OPENAI_MODEL: '  gpt-example  ',
        OPENAI_REASONING_EFFORT: ' high ',
        OPENAI_SERVICE_TIER: ' priority ',
      }),
    ).toEqual({
      apiKey: 'sk-test-secret',
      model: 'gpt-example',
      reasoningEffort: 'high',
      serviceTier: 'priority',
    })
  })

  it('should use the low-cost model and balanced standard processing by default', () => {
    expect(getOpenAiConfiguration(REQUIRED_ENVIRONMENT)).toEqual({
      apiKey: 'sk-test-secret',
      model: 'gpt-5.6-luna',
      reasoningEffort: 'medium',
      serviceTier: 'default',
    })
  })

  it.each([undefined, '', '  '])('should reject a missing API key', (apiKey) => {
    expect(() => getOpenAiConfiguration({...REQUIRED_ENVIRONMENT, OPENAI_API_KEY: apiKey})).toThrow(
      'OPENAI_API_KEY is not set',
    )
  })

  it.each([undefined, '', '\t'])('should use the default model when model is blank', (model) => {
    expect(getOpenAiConfiguration({...REQUIRED_ENVIRONMENT, OPENAI_MODEL: model}).model).toBe(
      'gpt-5.6-luna',
    )
  })

  it.each(OPENAI_REASONING_EFFORTS)(
    'should accept every supported reasoning effort',
    (reasoningEffort) => {
      expect(
        getOpenAiConfiguration({
          ...REQUIRED_ENVIRONMENT,
          OPENAI_REASONING_EFFORT: reasoningEffort,
        }).reasoningEffort,
      ).toBe(reasoningEffort)
    },
  )

  it.each(OPENAI_SERVICE_TIERS)('should accept every supported service tier', (serviceTier) => {
    expect(
      getOpenAiConfiguration({...REQUIRED_ENVIRONMENT, OPENAI_SERVICE_TIER: serviceTier})
        .serviceTier,
    ).toBe(serviceTier)
  })

  it('should reject an unsupported reasoning effort', () => {
    expect(() =>
      getOpenAiConfiguration({...REQUIRED_ENVIRONMENT, OPENAI_REASONING_EFFORT: 'ultra'}),
    ).toThrow(
      'OPENAI_REASONING_EFFORT must be one of: none, minimal, low, medium, high, xhigh, max',
    )
  })

  it('should reject an unsupported service tier', () => {
    expect(() =>
      getOpenAiConfiguration({...REQUIRED_ENVIRONMENT, OPENAI_SERVICE_TIER: 'fast'}),
    ).toThrow('OPENAI_SERVICE_TIER must be one of: auto, default, flex, priority')
  })
})

describe('getOpenAiWebhookSecret', () => {
  it('should return a trimmed webhook secret', () => {
    expect(getOpenAiWebhookSecret({OPENAI_WEBHOOK_SECRET: ' whsec_test '})).toBe('whsec_test')
  })

  it('should reject a missing webhook secret', () => {
    expect(() => getOpenAiWebhookSecret({})).toThrow('OPENAI_WEBHOOK_SECRET is not set')
  })
})
