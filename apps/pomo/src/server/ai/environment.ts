import 'server-only'

import {readEnum, readString} from '../environment/schema'

/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
export const OPENAI_REASONING_EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export const OPENAI_SERVICE_TIERS = ['auto', 'default', 'flex', 'priority'] as const

export type OpenAiReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number] | 'minimal'
export type OpenAiServiceTier = (typeof OPENAI_SERVICE_TIERS)[number]

export interface OpenAiEnvironment {
  readonly OPENAI_API_KEY?: string
  readonly OPENAI_MODEL?: string
  readonly OPENAI_REASONING_EFFORT?: string
  readonly OPENAI_SERVICE_TIER?: string
  readonly OPENAI_WEBHOOK_SECRET?: string
}

export interface OpenAiConfiguration {
  readonly apiKey: string
  readonly model: string
  readonly reasoningEffort: OpenAiReasoningEffort
  readonly serviceTier: OpenAiServiceTier
}

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna'

const isGpt56Model = (model: string): boolean => model === 'gpt-5.6' || model.startsWith('gpt-5.6-')

const parseReasoningEffort = (value: string | undefined, model: string): OpenAiReasoningEffort => {
  const values = isGpt56Model(model)
    ? OPENAI_REASONING_EFFORTS
    : (['minimal', ...OPENAI_REASONING_EFFORTS] as const)

  return readEnum('OPENAI_REASONING_EFFORT', value, values, 'medium')
}

const parseServiceTier = (value: string | undefined): OpenAiServiceTier =>
  readEnum('OPENAI_SERVICE_TIER', value, OPENAI_SERVICE_TIERS, 'default')

/** Returns validated server-only OpenAI generation settings. */
export const getOpenAiConfiguration = (
  environment: OpenAiEnvironment = process.env,
): OpenAiConfiguration => {
  const model = readString('OPENAI_MODEL', environment.OPENAI_MODEL, {
    defaultValue: DEFAULT_OPENAI_MODEL,
  })

  return {
    apiKey: readString('OPENAI_API_KEY', environment.OPENAI_API_KEY),
    model,
    reasoningEffort: parseReasoningEffort(environment.OPENAI_REASONING_EFFORT, model),
    serviceTier: parseServiceTier(environment.OPENAI_SERVICE_TIER),
  }
}

/** Returns the secret used to authenticate incoming OpenAI webhook events. */
export const getOpenAiWebhookSecret = (environment: OpenAiEnvironment = process.env): string =>
  readString('OPENAI_WEBHOOK_SECRET', environment.OPENAI_WEBHOOK_SECRET)
