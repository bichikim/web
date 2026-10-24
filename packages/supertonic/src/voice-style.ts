// oxlint-disable eslint-js/camelcase -- Supertonic voice JSON fields are fixed external contracts.
import {z} from 'zod'

import type {InvalidModelDataError} from './errors'
import {failureResult, type Result, successResult} from './result'

const voiceFieldSchema = z.object({data: z.unknown(), dims: z.array(z.number().int().positive())})
const voiceSchema = z.object({style_dp: voiceFieldSchema, style_ttl: voiceFieldSchema})

export interface SupertonicVoiceStyleField {
  readonly data: ReadonlyArray<number>
  readonly dimensions: ReadonlyArray<number>
}

export interface SupertonicVoiceStyle {
  readonly duration: SupertonicVoiceStyleField
  readonly speech: SupertonicVoiceStyleField
}

const createDataError = (): InvalidModelDataError => ({
  asset: 'voice',
  code: 'invalid-model-data',
  phase: 'validate',
  retryable: false,
})

const flattenNumbers = (value: unknown): Result<ReadonlyArray<number>, InvalidModelDataError> => {
  const pending: Array<unknown> = [value]
  const numbers: Array<number> = []

  while (pending.length > 0) {
    const item = pending.pop()

    if (typeof item === 'number' && Number.isFinite(item)) {
      numbers.push(item)
    } else if (Array.isArray(item)) {
      for (let index = item.length - 1; index >= 0; index -= 1) {
        pending.push(item[index])
      }
    } else {
      return failureResult(createDataError())
    }
  }

  return successResult(numbers)
}

const getValueCount = (dimensions: ReadonlyArray<number>) =>
  dimensions.reduce((count, dimension) => count * dimension, 1)

const parseVoiceField = (
  value: z.infer<typeof voiceFieldSchema>,
): Result<SupertonicVoiceStyleField, InvalidModelDataError> => {
  const data = flattenNumbers(value.data)
  const valueCount = getValueCount(value.dims)

  if (!data.ok || !Number.isSafeInteger(valueCount) || data.value.length !== valueCount) {
    return failureResult(createDataError())
  }

  return successResult({data: data.value, dimensions: value.dims})
}

/** Validates and normalizes a Supertonic 3 voice-style JSON value. */
export const parseSupertonicVoiceStyle = (
  value: unknown,
): Result<SupertonicVoiceStyle, InvalidModelDataError> => {
  const parsedVoice = voiceSchema.safeParse(value)

  if (!parsedVoice.success) {
    return failureResult(createDataError())
  }

  const duration = parseVoiceField(parsedVoice.data.style_dp)
  const speech = parseVoiceField(parsedVoice.data.style_ttl)

  if (!duration.ok) {
    return duration
  }

  if (!speech.ok) {
    return speech
  }

  return successResult({duration: duration.value, speech: speech.value})
}
