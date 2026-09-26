import {z} from 'zod'

import {AI_CAPABILITIES, type AiCapability} from './model-catalog.ts'

const MAXIMUM_AUDIO_BASE64_LENGTH = 14_000_000
const MAXIMUM_AUDIO_DURATION_SECONDS = 86_400
const MAXIMUM_AUDIO_LANGUAGE_LENGTH = 16
const MAXIMUM_ARTIFACT_OBJECT_KEY_LENGTH = 512
const MAXIMUM_IDEMPOTENCY_KEY_LENGTH = 128
const MAXIMUM_IMAGE_DIMENSION = 1024
const MAXIMUM_IMAGE_IDEA_LENGTH = 2000
const MAXIMUM_IMAGE_STEPS = 50
const MAXIMUM_MESSAGES = 64
const MAXIMUM_MODEL_ID_LENGTH = 128
const MAXIMUM_SOUND_PROMPT_LENGTH = 1000
const MAXIMUM_SOUND_DURATION_SECONDS = 120
const MAXIMUM_TEXT_TO_SPEECH_LENGTH = 5000
const MAXIMUM_VOICE_ID_LENGTH = 32
const MAXIMUM_SEED = 4_294_967_295
const MINIMUM_IMAGE_DIMENSION = 256
const MINIMUM_IDEMPOTENCY_KEY_LENGTH = 8
const MINIMUM_TEXT_TO_SPEECH_SPEED = 3
const MAXIMUM_TEXT_LENGTH = 12_000
const MAXIMUM_TEXT_OUTPUT_TOKENS = 4096
const IMAGE_DIMENSION_STEP = 16

const textMessageSchema = z.object({
  content: z.string().trim().min(1).max(MAXIMUM_TEXT_LENGTH),
  role: z.enum(['assistant', 'system', 'user']),
})

export const textJobInputSchema = z.object({
  messages: z.array(textMessageSchema).min(1).max(MAXIMUM_MESSAGES),
  parameters: z
    .object({
      maximumTokens: z
        .number()
        .int()
        .min(1)
        .max(MAXIMUM_TEXT_OUTPUT_TOKENS)
        .default(MAXIMUM_TEXT_OUTPUT_TOKENS),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
    })
    .default({maximumTokens: MAXIMUM_TEXT_OUTPUT_TOKENS}),
})

// Remote URLs are deliberately unsupported until an authenticated upload/egress policy exists.
export const speechToTextJobInputSchema = z.object({
  audioBase64: z.string().min(1).max(MAXIMUM_AUDIO_BASE64_LENGTH),
  durationSeconds: z.number().positive().max(MAXIMUM_AUDIO_DURATION_SECONDS).optional(),
  language: z.string().trim().min(2).max(MAXIMUM_AUDIO_LANGUAGE_LENGTH).optional(),
})

export const textToSpeechJobInputSchema = z.object({
  speed: z.number().positive().max(MINIMUM_TEXT_TO_SPEECH_SPEED).optional(),
  text: z.string().trim().min(1).max(MAXIMUM_TEXT_TO_SPEECH_LENGTH),
  voiceId: z.string().trim().min(1).max(MAXIMUM_VOICE_ID_LENGTH),
})

export const imageJobInputSchema = z.object({
  height: z
    .number()
    .int()
    .min(MINIMUM_IMAGE_DIMENSION)
    .max(MAXIMUM_IMAGE_DIMENSION)
    .multipleOf(IMAGE_DIMENSION_STEP),
  idea: z.string().trim().min(1).max(MAXIMUM_IMAGE_IDEA_LENGTH),
  seed: z.number().int().min(0).max(MAXIMUM_SEED),
  steps: z.number().int().min(1).max(MAXIMUM_IMAGE_STEPS),
  width: z
    .number()
    .int()
    .min(MINIMUM_IMAGE_DIMENSION)
    .max(MAXIMUM_IMAGE_DIMENSION)
    .multipleOf(IMAGE_DIMENSION_STEP),
})

export const soundJobInputSchema = z.object({
  durationSeconds: z.number().positive().max(MAXIMUM_SOUND_DURATION_SECONDS),
  prompt: z.string().trim().min(1).max(MAXIMUM_SOUND_PROMPT_LENGTH),
  seed: z.number().int().min(0).max(MAXIMUM_SEED).optional(),
  steps: z.number().int().min(1).max(MAXIMUM_IMAGE_STEPS).optional(),
})

const capabilitySchema = z.enum(AI_CAPABILITIES)

export const createAiJobRequestSchema = z.object({
  capability: capabilitySchema,
  idempotencyKey: z
    .string()
    .trim()
    .min(MINIMUM_IDEMPOTENCY_KEY_LENGTH)
    .max(MAXIMUM_IDEMPOTENCY_KEY_LENGTH),
  input: z.record(z.string(), z.unknown()),
  modelId: z.string().trim().min(1).max(MAXIMUM_MODEL_ID_LENGTH).optional(),
})

export type CreateAiJobRequest = z.infer<typeof createAiJobRequestSchema>
export type AiJobInput =
  | z.infer<typeof imageJobInputSchema>
  | z.infer<typeof soundJobInputSchema>
  | z.infer<typeof speechToTextJobInputSchema>
  | z.infer<typeof textJobInputSchema>
  | z.infer<typeof textToSpeechJobInputSchema>

const inputSchemas: Readonly<Record<AiCapability, z.ZodType<AiJobInput>>> = {
  image: imageJobInputSchema,
  sound: soundJobInputSchema,
  'speech-to-text': speechToTextJobInputSchema,
  text: textJobInputSchema,
  'text-to-speech': textToSpeechJobInputSchema,
}

export const parseAiJobInput = (capability: AiCapability, input: unknown): AiJobInput =>
  inputSchemas[capability].parse(input)

export const runnerCapabilityFor = (
  capability: AiCapability,
): 'image' | 'sound' | 'speech_to_text' | 'text' | 'text_to_speech' => {
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

export const aiJobResultSchema = z
  .object({
    artifact: z
      .object({
        contentType: z.string().min(1).max(MAXIMUM_MODEL_ID_LENGTH),
        durationMs: z.number().int().nonnegative().optional(),
        objectKey: z
          .string()
          .min(1)
          .max(MAXIMUM_ARTIFACT_OBJECT_KEY_LENGTH)
          .refine(
            (value) =>
              value.startsWith('ai/jobs/') &&
              !value.includes('..') &&
              !value.includes('\\') &&
              !value.endsWith('/'),
            'A private AI artifact object key is required',
          ),
        sizeBytes: z.number().int().positive().optional(),
      })
      .optional(),
    metrics: z
      .object({
        inferenceMs: z.number().int().nonnegative().optional(),
        queueMs: z.number().int().nonnegative().optional(),
      })
      .optional(),
    text: z
      .string()
      .max(MAXIMUM_TEXT_LENGTH)
      .refine((text) => text.trim().length > 0, 'Non-empty text is required')
      .optional(),
  })
  .refine((result) => result.artifact !== undefined || result.text !== undefined, {
    message: 'text or artifact is required',
  })

export type AiJobResult = z.infer<typeof aiJobResultSchema>

const artifactContentTypeFor = (capability: AiCapability): RegExp | null => {
  switch (capability) {
    case 'image':
      return /^image\//u
    case 'sound':
    case 'text-to-speech':
      return /^audio\//u
    case 'speech-to-text':
    case 'text':
      return null
  }
}

export const parseAiJobResult = (capability: AiCapability, value: unknown): AiJobResult => {
  const result = aiJobResultSchema.parse(value)
  const expectedContentType = artifactContentTypeFor(capability)

  if (expectedContentType === null) {
    if (result.text === undefined || result.artifact !== undefined) {
      throw new TypeError(`AI ${capability} jobs must return text only`)
    }

    return result
  }

  if (
    result.artifact === undefined ||
    result.text !== undefined ||
    !expectedContentType.test(result.artifact.contentType.toLowerCase())
  ) {
    throw new TypeError(`AI ${capability} jobs must return a matching artifact`)
  }

  return result
}
