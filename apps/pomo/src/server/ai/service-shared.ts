import {createHash} from 'node:crypto'

import type {AiJobPayload} from 'src/server/database'
import type {AiJobRecord} from 'src/server/repositories/ai-jobs'

import type {CreateAiJobRequest} from './contracts'
import type {AiCapability} from './model-catalog'
import type {AiCreditProfile} from './policy'

export const OPENAI_RESPONSE_FAILURE = 'openai-response-failed'
export const INVALID_OPENAI_RESULT = 'invalid-openai-result'
export const MAXIMUM_PROGRESS = 100
export const MINIMUM_JOB_TIMEOUT_MS = 5_000
export const SERVER_TEXT_MODEL_ID = 'gpt-5.6-luna'
export const MAXIMUM_RECOVERY_CONCURRENCY = 8
export const MAXIMUM_ARTIFACT_STATE_RETRIES = 1
export const MINIMUM_DOWNLOAD_LIFETIME_MS = 1000

export class AiProviderAcceptancePersistenceError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, {cause})
    this.name = 'AiProviderAcceptancePersistenceError'
  }
}

export type AiServiceErrorCode =
  | 'configuration-error'
  | 'invalid-input'
  | 'model-not-supported'
  | 'not-entitled'
  | 'queue-exceeded'
  | 'quota-exceeded'
  | 'idempotency-conflict'

export type CreateAiJobServiceResult =
  | {readonly kind: 'accepted'; readonly job: AiJobRecord; readonly created: boolean}
  | {readonly kind: 'error'; readonly code: AiServiceErrorCode}

export type DispatchAiJobResult =
  | {readonly kind: 'dispatched'; readonly job: AiJobRecord}
  | {readonly kind: 'queued'; readonly job: AiJobRecord}
  | {readonly kind: 'recovery-pending'; readonly job: AiJobRecord}
  | {readonly kind: 'terminal'; readonly job: AiJobRecord}

export type DatabaseAiCapability = 'image' | 'sound' | 'speech_to_text' | 'text' | 'text_to_speech'

export const parseCreditProfile = (value: string | undefined): AiCreditProfile | undefined => {
  if (value === undefined) {
    return undefined
  }

  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('POMO_AI_CREDIT_PROFILE_JSON must be a JSON object')
  }

  const profile: Record<string, number> = {}
  for (const [key, entry] of Object.entries(parsed)) {
    if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0) {
      throw new TypeError(`POMO_AI_CREDIT_PROFILE_JSON.${key} must be a non-negative number`)
    }
    profile[key] = entry
  }

  return profile
}

export const toDatabaseCapability = (capability: AiCapability): DatabaseAiCapability => {
  switch (capability) {
    case 'image':
      return 'image'
    case 'sound':
      return 'sound'
    case 'speech-to-text':
      return 'speech_to_text'
    case 'text':
      return 'text'
    case 'text-to-speech':
      return 'text_to_speech'
  }
}

export const calculateRequestHash = (request: CreateAiJobRequest): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        capability: request.capability,
        input: request.input,
        modelId: request.modelId,
      }),
    )
    .digest('hex')

export const createTimeout = (now: Date, runnerTimeoutMs: number): Date =>
  new Date(now.getTime() + Math.max(runnerTimeoutMs, MINIMUM_JOB_TIMEOUT_MS))

export const asBilledUsage = (value: unknown): AiJobPayload | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as AiJobPayload)
    : null

export const toCatalogCapability = (capability: DatabaseAiCapability): AiCapability => {
  switch (capability) {
    case 'image':
      return 'image'
    case 'sound':
      return 'sound'
    case 'speech_to_text':
      return 'speech-to-text'
    case 'text':
      return 'text'
    case 'text_to_speech':
      return 'text-to-speech'
  }
}

export const OPENAI_RESPONSE_PREFIX = 'openai:'
