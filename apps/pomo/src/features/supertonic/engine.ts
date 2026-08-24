// oxlint-disable eslint-js/camelcase -- Supertonic ONNX tensor names and model JSON fields are fixed external contracts.
// oxlint-disable no-await-in-loop -- Every denoising step consumes the result of the previous step.
import type {InferenceSession, Tensor} from 'onnxruntime-web/wasm'
import {z} from 'zod'

import type {InvalidModelDataError} from './errors'
import type {SupertonicLanguage} from './language'
import type {SupertonicRuntime} from './runtime'
import {failureResult, type Result, successResult} from '../result'
import {parseSupertonicVoiceStyle, type SupertonicVoiceStyle} from './voice-style'

const configSchema = z.object({
  ae: z.object({base_chunk_size: z.number(), sample_rate: z.number()}),
  ttl: z.object({chunk_compress_factor: z.number(), latent_dim: z.number()}),
})
const indexerSchema = z.array(z.number().int())
const MINIMUM_RANDOM_VALUE = 0.0001
const BOX_MULLER_SCALE = -2

export interface SupertonicSessions {
  readonly durationPredictor: InferenceSession
  readonly textEncoder: InferenceSession
  readonly vectorEstimator: InferenceSession
  readonly vocoder: InferenceSession
}

export interface SupertonicVoice {
  readonly durationStyle: Tensor
  readonly speechStyle: Tensor
}

interface GenerateAudioOptions {
  readonly language: SupertonicLanguage
  readonly onProgress: (step: number, total: number) => void
  readonly speed: number
  readonly text: string
  readonly voice: SupertonicVoice
}

const createDataError = (asset: InvalidModelDataError['asset']): InvalidModelDataError => ({
  asset,
  code: 'invalid-model-data',
  phase: 'validate',
  retryable: false,
})

const createFloatTensor = (
  runtime: SupertonicRuntime,
  values: ReadonlyArray<number>,
  dimensions: ReadonlyArray<number>,
) => new runtime.Tensor('float32', Float32Array.from(values), Array.from(dimensions))

export const createSupertonicVoice = (
  runtime: SupertonicRuntime,
  style: SupertonicVoiceStyle,
): SupertonicVoice => ({
  durationStyle: createFloatTensor(runtime, style.duration.data, style.duration.dimensions),
  speechStyle: createFloatTensor(runtime, style.speech.data, style.speech.dimensions),
})

export const parseSupertonicConfig = (
  value: unknown,
): Result<SupertonicConfig, InvalidModelDataError> => {
  const result = configSchema.safeParse(value)
  return result.success ? successResult(result.data) : failureResult(createDataError('config'))
}

export const parseSupertonicIndexer = (
  value: unknown,
): Result<SupertonicIndexer, InvalidModelDataError> => {
  const result = indexerSchema.safeParse(value)
  return result.success ? successResult(result.data) : failureResult(createDataError('indexer'))
}

export const parseSupertonicVoice = (
  runtime: SupertonicRuntime,
  value: unknown,
): Result<SupertonicVoice, InvalidModelDataError> => {
  const voiceStyle = parseSupertonicVoiceStyle(value)

  if (!voiceStyle.ok) {
    return voiceStyle
  }

  return successResult(createSupertonicVoice(runtime, voiceStyle.value))
}

export type SupertonicConfig = z.infer<typeof configSchema>
export type SupertonicIndexer = z.infer<typeof indexerSchema>

const preprocessText = (input: string, language: SupertonicLanguage) => {
  let text = input
    .normalize('NFKD')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu, '')
    .replace(/[–‑—]/gu, '-')
    .replace(/[[\]_|/#→←]/gu, ' ')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’´`]/gu, "'")
    .replace(/[♥☆♡©\\]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()

  if (!/[.!?;:,'")\]}…。」』】〉》›»]$/u.test(text)) {
    text += '.'
  }

  return `<${language}>${text}</${language}>`
}

const createTextInput = (
  runtime: SupertonicRuntime,
  text: string,
  language: SupertonicLanguage,
  indexer: SupertonicIndexer,
) => {
  const characters = Array.from(preprocessText(text, language))
  const ids = characters.map((character) => {
    const codePoint = character.codePointAt(0)

    if (codePoint === undefined || codePoint >= indexer.length) {
      return -1
    }

    return indexer[codePoint] ?? -1
  })
  const textIds = new runtime.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length])
  const textMask = new runtime.Tensor('float32', new Float32Array(ids.length).fill(1), [
    1,
    1,
    ids.length,
  ])

  return {textIds, textMask}
}

const getFloatData = (tensor: Tensor) => {
  if (!(tensor.data instanceof Float32Array)) {
    throw new Error('Supertonic 모델이 예상하지 못한 결과를 반환했어요.')
  }

  return tensor.data
}

const createNoise = (length: number) => {
  const noise = new Float32Array(length)

  for (let index = 0; index < length; index += 1) {
    const firstRandom = Math.max(MINIMUM_RANDOM_VALUE, Math.random())
    const secondRandom = Math.random()
    noise[index] =
      Math.sqrt(BOX_MULLER_SCALE * Math.log(firstRandom)) *
      Math.cos(-BOX_MULLER_SCALE * Math.PI * secondRandom)
  }

  return noise
}

export class SupertonicEngine {
  readonly #config: SupertonicConfig
  readonly #indexer: SupertonicIndexer
  readonly #runtime: SupertonicRuntime
  readonly #sessions: SupertonicSessions

  constructor(
    config: SupertonicConfig,
    indexer: SupertonicIndexer,
    sessions: SupertonicSessions,
    runtime: SupertonicRuntime,
  ) {
    this.#config = config
    this.#indexer = indexer
    this.#runtime = runtime
    this.#sessions = sessions
  }

  get sampleRate() {
    return this.#config.ae.sample_rate
  }

  async generate(options: GenerateAudioOptions): Promise<Float32Array> {
    const {textIds, textMask} = createTextInput(
      this.#runtime,
      options.text,
      options.language,
      this.#indexer,
    )
    const durationResult = await this.#sessions.durationPredictor.run({
      style_dp: options.voice.durationStyle,
      text_ids: textIds,
      text_mask: textMask,
    })
    const durationData = getFloatData(durationResult.duration)
    const duration = durationData[0] / options.speed
    const textResult = await this.#sessions.textEncoder.run({
      style_ttl: options.voice.speechStyle,
      text_ids: textIds,
      text_mask: textMask,
    })

    const chunkSize = this.#config.ae.base_chunk_size * this.#config.ttl.chunk_compress_factor
    const latentLength = Math.ceil((duration * this.sampleRate) / chunkSize)
    const latentDimension = this.#config.ttl.latent_dim * this.#config.ttl.chunk_compress_factor
    const latentShape = [1, latentDimension, latentLength]
    const latentMask = new this.#runtime.Tensor('float32', new Float32Array(latentLength).fill(1), [
      1,
      1,
      latentLength,
    ])
    const totalSteps = 8
    const totalStepTensor = new this.#runtime.Tensor('float32', Float32Array.of(totalSteps), [1])
    const latent = createNoise(latentDimension * latentLength)

    for (let step = 0; step < totalSteps; step += 1) {
      options.onProgress(step + 1, totalSteps)
      const result = await this.#sessions.vectorEstimator.run({
        current_step: new this.#runtime.Tensor('float32', Float32Array.of(step), [1]),
        latent_mask: latentMask,
        noisy_latent: new this.#runtime.Tensor('float32', latent, latentShape),
        style_ttl: options.voice.speechStyle,
        text_emb: textResult.text_emb,
        text_mask: textMask,
        total_step: totalStepTensor,
      })
      latent.set(getFloatData(result.denoised_latent))
    }

    const vocoderResult = await this.#sessions.vocoder.run({
      latent: new this.#runtime.Tensor('float32', latent, latentShape),
    })
    const samples = getFloatData(vocoderResult.wav_tts)
    return samples.slice(0, Math.floor(this.sampleRate * duration))
  }

  async release() {
    await Promise.all(Object.values(this.#sessions).map((session) => session.release()))
  }
}
