/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
export const OPENAI_REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const

export const OPENAI_SERVICE_TIERS = ['auto', 'default', 'flex', 'priority'] as const

export type OpenAiReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number]
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

const requireValue = (value: string | undefined, name: string): string => {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new TypeError(`${name} is not set`)
  }

  return normalizedValue
}

const parseReasoningEffort = (value: string | undefined): OpenAiReasoningEffort => {
  const normalizedValue = value?.trim() || 'medium'

  switch (normalizedValue) {
    case 'none':
    case 'minimal':
    case 'low':
    case 'medium':
    case 'high':
    case 'xhigh':
    case 'max':
      return normalizedValue
    default:
      throw new TypeError(
        `OPENAI_REASONING_EFFORT must be one of: ${OPENAI_REASONING_EFFORTS.join(', ')}`,
      )
  }
}

const parseServiceTier = (value: string | undefined): OpenAiServiceTier => {
  const normalizedValue = value?.trim() || 'default'

  switch (normalizedValue) {
    case 'auto':
    case 'default':
    case 'flex':
    case 'priority':
      return normalizedValue
    default:
      throw new TypeError(`OPENAI_SERVICE_TIER must be one of: ${OPENAI_SERVICE_TIERS.join(', ')}`)
  }
}

/** Returns validated server-only OpenAI generation settings. */
export const getOpenAiConfiguration = (
  environment: OpenAiEnvironment = process.env,
): OpenAiConfiguration => ({
  apiKey: requireValue(environment.OPENAI_API_KEY, 'OPENAI_API_KEY'),
  model: environment.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
  reasoningEffort: parseReasoningEffort(environment.OPENAI_REASONING_EFFORT),
  serviceTier: parseServiceTier(environment.OPENAI_SERVICE_TIER),
})

/** Returns the secret used to authenticate incoming OpenAI webhook events. */
export const getOpenAiWebhookSecret = (environment: OpenAiEnvironment = process.env): string =>
  requireValue(environment.OPENAI_WEBHOOK_SECRET, 'OPENAI_WEBHOOK_SECRET')
