import {clampUnit} from '../../utils/clamp-unit/index.ts'
// oxlint-disable eslint-js/camelcase -- Supertonic ONNX tensor names are an external model contract.
// oxlint-disable no-await-in-loop -- Each denoising step consumes the previous step.
// oxlint-disable no-magic-numbers -- Model tensor dimensions and progress phases are fixed execution values.
// oxlint-disable max-params -- The tensor generation function maps the model's explicit inputs.
// oxlint-disable no-void -- Cache options are intentionally accepted by the shared executor factory.
import {z} from 'zod'

import {RunnerExecutionError} from './errors.ts'
import {createWaveBuffer} from './audio.ts'
import type {RunnerArtifactExecutionResult, RunnerExecutionContext} from './types.ts'

interface OrtTensor {
  readonly data: unknown
}

interface OrtSession {
  release(): Promise<void>
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>
}

interface OrtModule {
  readonly InferenceSession: {
    create(
      model: Uint8Array,
      options: {readonly executionProviders: ReadonlyArray<string>},
    ): Promise<OrtSession>
  }
  readonly Tensor: new (
    type: string,
    data: ArrayBufferView | ReadonlyArray<number> | ReadonlyArray<bigint>,
    dimensions: ReadonlyArray<number>,
  ) => OrtTensor
}

interface SupertonicConfig {
  readonly ae: {readonly base_chunk_size: number; readonly sample_rate: number}
  readonly ttl: {readonly chunk_compress_factor: number; readonly latent_dim: number}
}

interface SupertonicVoice {
  readonly durationStyle: OrtTensor
  readonly speechStyle: OrtTensor
}

interface SupertonicState {
  readonly config: SupertonicConfig
  readonly indexer: ReadonlyArray<number>
  readonly runtime: OrtModule
  readonly sessions: {
    readonly durationPredictor: OrtSession
    readonly textEncoder: OrtSession
    readonly vectorEstimator: OrtSession
    readonly vocoder: OrtSession
  }
}

interface SupertonicProfile {
  readonly baseUrl: string
  readonly files: Readonly<
    Record<'durationPredictor' | 'textEncoder' | 'vectorEstimator' | 'vocoder', string>
  >
}

const MODEL_STORAGE_URL = 'https://storage.pomofi.io/models'
const FULL_REVISION = '3cadd1e'
const INT8_REVISION = 'cca5a0e6c96e1d2c720986bf7e75fcc81dee3ae4'
const FULL_BASE_URL = `${MODEL_STORAGE_URL}/supertonic-3/${FULL_REVISION}`
const INT8_BASE_URL = `${MODEL_STORAGE_URL}/supertonic-3-int8/${INT8_REVISION}`
const SUPERTONIC_CONFIG_URL = `${FULL_BASE_URL}/onnx/tts.json`
const SUPERTONIC_INDEXER_URL = `${FULL_BASE_URL}/onnx/unicode_indexer.json`
const SUPERTONIC_RECOMMENDED_TEXT_LENGTH = 150
const SUPERTONIC_MAXIMUM_TEXT_LENGTH = 200
const SUPERTONIC_SILENCE_SECONDS = 0.3

const PROFILES: Readonly<Record<'supertonic-full' | 'supertonic-int8', SupertonicProfile>> = {
  'supertonic-full': {
    baseUrl: FULL_BASE_URL,
    files: {
      durationPredictor: 'onnx/duration_predictor.onnx',
      textEncoder: 'onnx/text_encoder.onnx',
      vectorEstimator: 'onnx/vector_estimator.onnx',
      vocoder: 'onnx/vocoder.onnx',
    },
  },
  'supertonic-int8': {
    baseUrl: INT8_BASE_URL,
    files: {
      durationPredictor: 'duration_predictor.int8.onnx',
      textEncoder: 'text_encoder.int8.onnx',
      vectorEstimator: 'vector_estimator.int8.onnx',
      vocoder: 'vocoder.int8.onnx',
    },
  },
}

const VOICE_FILE_NAMES: Readonly<Record<string, string>> = {
  F1: 'sarah',
  F2: 'lily',
  F3: 'jessica',
  F4: 'olivia',
  F5: 'emily',
  Hana: 'hana',
  M1: 'alex',
  M2: 'james',
  M3: 'robert',
  M4: 'sam',
  M5: 'daniel',
  Mina: 'mina',
  Sora: 'sora',
  Yuna: 'yuna',
}

const configSchema = z.object({
  ae: z.object({base_chunk_size: z.number(), sample_rate: z.number()}),
  ttl: z.object({chunk_compress_factor: z.number(), latent_dim: z.number()}),
})
const voiceFieldSchema = z.object({data: z.unknown(), dims: z.array(z.number().int().positive())})
const voiceSchema = z.object({style_dp: voiceFieldSchema, style_ttl: voiceFieldSchema})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fetchJson = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, {signal})
  if (!response.ok) {
    throw new RunnerExecutionError(
      'model-download-failed',
      `Model metadata download failed: ${response.status}`,
    )
  }
  return response.json()
}

const fetchModelBuffer = async (url: string, signal: AbortSignal): Promise<Uint8Array> => {
  const response = await fetch(url, {signal})
  if (!response.ok) {
    throw new RunnerExecutionError(
      'model-download-failed',
      `Model download failed: ${response.status}`,
    )
  }
  return new Uint8Array(await response.arrayBuffer())
}

const flattenNumbers = (value: unknown): number[] => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value]
  }
  if (!Array.isArray(value)) {
    throw new RunnerExecutionError('invalid-model-data', 'Supertonic voice style data is invalid')
  }
  return value.flatMap(flattenNumbers)
}

const createVoice = (runtime: OrtModule, value: unknown): SupertonicVoice => {
  const parsed = voiceSchema.safeParse(value)
  if (!parsed.success) {
    throw new RunnerExecutionError('invalid-model-data', 'Supertonic voice style data is invalid')
  }
  const createField = (field: typeof parsed.data.style_dp) => {
    const data = flattenNumbers(field.data)
    const expectedCount = field.dims.reduce((count, dimension) => count * dimension, 1)
    if (data.length !== expectedCount) {
      throw new RunnerExecutionError(
        'invalid-model-data',
        'Supertonic voice style dimensions are invalid',
      )
    }
    return new runtime.Tensor('float32', Float32Array.from(data), field.dims)
  }
  return {
    durationStyle: createField(parsed.data.style_dp),
    speechStyle: createField(parsed.data.style_ttl),
  }
}

const loadSession = async (runtime: OrtModule, bytes: Uint8Array): Promise<OrtSession> =>
  runtime.InferenceSession.create(bytes, {executionProviders: ['cpu']})

const loadState = async (
  modelId: keyof typeof PROFILES,
  context: RunnerExecutionContext,
): Promise<SupertonicState> => {
  const runtime = (await import('onnxruntime-node')) as unknown as OrtModule
  const profile = PROFILES[modelId]
  context.onProgress(5)
  const [configValue, indexerValue] = await Promise.all([
    fetchJson(SUPERTONIC_CONFIG_URL, context.signal),
    fetchJson(SUPERTONIC_INDEXER_URL, context.signal),
  ])
  const configResult = configSchema.safeParse(configValue)
  const indexerResult = z.array(z.number().int()).safeParse(indexerValue)
  if (!configResult.success || !indexerResult.success) {
    throw new RunnerExecutionError('invalid-model-data', 'Supertonic model metadata is invalid')
  }
  context.onProgress(12)

  const [durationPredictorBytes, textEncoderBytes, vectorEstimatorBytes, vocoderBytes] =
    await Promise.all([
      fetchModelBuffer(`${profile.baseUrl}/${profile.files.durationPredictor}`, context.signal),
      fetchModelBuffer(`${profile.baseUrl}/${profile.files.textEncoder}`, context.signal),
      fetchModelBuffer(`${profile.baseUrl}/${profile.files.vectorEstimator}`, context.signal),
      fetchModelBuffer(`${profile.baseUrl}/${profile.files.vocoder}`, context.signal),
    ])
  context.onProgress(38)
  const sessions = {
    durationPredictor: await loadSession(runtime, durationPredictorBytes),
    textEncoder: await loadSession(runtime, textEncoderBytes),
    vectorEstimator: await loadSession(runtime, vectorEstimatorBytes),
    vocoder: await loadSession(runtime, vocoderBytes),
  }
  context.onProgress(45)
  return {config: configResult.data, indexer: indexerResult.data, runtime, sessions}
}

const getFloatData = (value: unknown): Float32Array => {
  if (!isRecord(value) || !(value.data instanceof Float32Array)) {
    throw new RunnerExecutionError('invalid-model-output', 'Supertonic returned an invalid tensor')
  }
  return value.data
}

const preprocessText = (input: string): string => {
  let text = input
    .normalize('NFKD')
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u{1F1E6}-\u{1F1FF}]+/gu, '')
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
  return `<ko>${text}</ko>`
}

const findTextBreak = (characters: ReadonlyArray<string>): number => {
  const breakCharacters = /[\s,;:!?…。！？、，；：]/u
  for (
    let index = Math.min(SUPERTONIC_RECOMMENDED_TEXT_LENGTH, characters.length);
    index >= 120;
    index -= 1
  ) {
    if (breakCharacters.test(characters[index - 1] ?? '')) {
      return index
    }
  }
  return Math.min(SUPERTONIC_RECOMMENDED_TEXT_LENGTH, characters.length)
}

const splitLongSupertonicText = (text: string): ReadonlyArray<string> => {
  const chunks: Array<string> = []
  let remaining = Array.from(text.trim())
  while (remaining.length > SUPERTONIC_MAXIMUM_TEXT_LENGTH) {
    const breakIndex = findTextBreak(remaining)
    chunks.push(remaining.slice(0, breakIndex).join('').trim())
    remaining = remaining.slice(breakIndex)
  }
  if (remaining.length > 0) {
    chunks.push(remaining.join('').trim())
  }
  return chunks
}

const splitSupertonicText = (text: string): ReadonlyArray<string> => {
  const segmenter = new Intl.Segmenter('ko', {granularity: 'sentence'})
  const sentences = Array.from(segmenter.segment(text), ({segment}) => segment.trim()).filter(
    (sentence) => sentence.length > 0,
  )
  const chunks: Array<string> = []
  let current = ''
  for (const sentence of sentences.flatMap(splitLongSupertonicText)) {
    const candidate = current.length === 0 ? sentence : `${current} ${sentence}`
    if (current.length > 0 && Array.from(candidate).length > SUPERTONIC_RECOMMENDED_TEXT_LENGTH) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current.length > 0) {
    chunks.push(current)
  }
  return chunks.length > 0 ? chunks : [text.trim()]
}

const createNoise = (length: number): Float32Array => {
  const noise = new Float32Array(length)
  for (let index = 0; index < length; index += 1) {
    const firstRandom = Math.max(0.0001, Math.random())
    const secondRandom = Math.random()
    noise[index] = Math.sqrt(-2 * Math.log(firstRandom)) * Math.cos(2 * Math.PI * secondRandom)
  }
  return noise
}

const createVoiceInput = (
  state: SupertonicState,
  text: string,
  voice: SupertonicVoice,
): {readonly textIds: OrtTensor; readonly textMask: OrtTensor} => {
  const ids = Array.from(preprocessText(text)).map((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < state.indexer.length ? (state.indexer[codePoint] ?? -1) : -1
  })
  const textIds = new state.runtime.Tensor('int64', BigInt64Array.from(ids, BigInt), [
    1,
    ids.length,
  ])
  const textMask = new state.runtime.Tensor('float32', new Float32Array(ids.length).fill(1), [
    1,
    1,
    ids.length,
  ])
  return {textIds, textMask}
}

const generateSamples = async (
  state: SupertonicState,
  voice: SupertonicVoice,
  text: string,
  speed: number,
  context: RunnerExecutionContext,
): Promise<Float32Array> => {
  const {textIds, textMask} = createVoiceInput(state, text, voice)
  const durationResult = await state.sessions.durationPredictor.run({
    style_dp: voice.durationStyle,
    text_ids: textIds,
    text_mask: textMask,
  })
  const durationData = getFloatData(durationResult.duration)
  const duration = durationData[0] / speed
  if (!Number.isFinite(duration) || duration <= 0 || duration > 120) {
    throw new RunnerExecutionError(
      'invalid-model-output',
      'Supertonic returned an invalid duration',
    )
  }
  const textResult = await state.sessions.textEncoder.run({
    style_ttl: voice.speechStyle,
    text_ids: textIds,
    text_mask: textMask,
  })
  const chunkSize = state.config.ae.base_chunk_size * state.config.ttl.chunk_compress_factor
  const latentLength = Math.ceil((duration * state.config.ae.sample_rate) / chunkSize)
  const latentDimension = state.config.ttl.latent_dim * state.config.ttl.chunk_compress_factor
  const latentShape = [1, latentDimension, latentLength]
  const latentMask = new state.runtime.Tensor('float32', new Float32Array(latentLength).fill(1), [
    1,
    1,
    latentLength,
  ])
  const totalStepTensor = new state.runtime.Tensor('float32', Float32Array.of(8), [1])
  const latent = createNoise(latentDimension * latentLength)

  for (let step = 0; step < 8; step += 1) {
    if (context.signal.aborted) {
      throw new RunnerExecutionError('cancelled', 'Supertonic generation was cancelled')
    }
    context.onProgress(50 + Math.floor(((step + 1) / 8) * 40))
    const result = await state.sessions.vectorEstimator.run({
      current_step: new state.runtime.Tensor('float32', Float32Array.of(step), [1]),
      latent_mask: latentMask,
      noisy_latent: new state.runtime.Tensor('float32', latent, latentShape),
      style_ttl: voice.speechStyle,
      text_emb: textResult.text_emb,
      text_mask: textMask,
      total_step: totalStepTensor,
    })
    latent.set(getFloatData(result.denoised_latent))
  }
  const vocoderResult = await state.sessions.vocoder.run({
    latent: new state.runtime.Tensor('float32', latent, latentShape),
  })
  return getFloatData(vocoderResult.wav_tts).slice(
    0,
    Math.floor(state.config.ae.sample_rate * duration),
  )
}

const joinAudioChunks = (chunks: ReadonlyArray<Float32Array>, sampleRate: number): Float32Array => {
  const silenceLength = Math.floor(sampleRate * SUPERTONIC_SILENCE_SECONDS)
  const totalLength =
    chunks.reduce((total, chunk) => total + chunk.length, 0) +
    Math.max(0, chunks.length - 1) * silenceLength
  const samples = new Float32Array(totalLength)
  let offset = 0
  for (const [index, chunk] of chunks.entries()) {
    samples.set(chunk, offset)
    offset += chunk.length
    if (index < chunks.length - 1) {
      offset += silenceLength
    }
  }
  return samples
}

const releaseState = async (state: SupertonicState): Promise<void> => {
  await Promise.all(Object.values(state.sessions).map((session) => session.release()))
}

export const createSupertonicExecutor = () => {
  let activeModelId: keyof typeof PROFILES | null = null
  let statePromise: Promise<SupertonicState> | null = null

  const getState = async (
    modelId: keyof typeof PROFILES,
    context: RunnerExecutionContext,
  ): Promise<SupertonicState> => {
    if (statePromise !== null && activeModelId === modelId) {
      return statePromise
    }
    if (statePromise !== null) {
      const previous = await statePromise.catch(() => null)
      if (previous !== null) {
        await releaseState(previous)
      }
    }
    activeModelId = modelId
    statePromise = loadState(modelId, context)
    try {
      return await statePromise
    } catch (error: unknown) {
      statePromise = null
      activeModelId = null
      throw error
    }
  }

  return async (
    modelId: keyof typeof PROFILES,
    input: {readonly speed?: number; readonly text: string; readonly voiceId: string},
    context: RunnerExecutionContext,
  ): Promise<RunnerArtifactExecutionResult> => {
    const voiceName = VOICE_FILE_NAMES[input.voiceId]
    if (voiceName === undefined) {
      throw new RunnerExecutionError(
        'unsupported-voice',
        `Unsupported Supertonic voice: ${input.voiceId}`,
      )
    }
    const state = await getState(modelId, context)
    const voiceValue = await fetchJson(
      `${FULL_BASE_URL}/voice-styles/${voiceName}.json`,
      context.signal,
    )
    const voice = createVoice(state.runtime, voiceValue)
    const chunks = splitSupertonicText(input.text)
    const generatedChunks: Array<Float32Array> = []
    for (const [index, chunk] of chunks.entries()) {
      const chunkContext: RunnerExecutionContext = {
        onProgress: (progress) => {
          const chunkProgress = clampUnit((progress - 50) / 40)
          context.onProgress(48 + Math.floor(((index + chunkProgress) / chunks.length) * 48))
        },
        signal: context.signal,
      }
      generatedChunks.push(
        await generateSamples(state, voice, chunk, input.speed ?? 1, chunkContext),
      )
    }
    const samples = joinAudioChunks(generatedChunks, state.config.ae.sample_rate)
    const bytes = createWaveBuffer(samples, state.config.ae.sample_rate)
    context.onProgress(100)
    return {
      bytes,
      contentType: 'audio/wav',
      durationMs: Math.round((samples.length / state.config.ae.sample_rate) * 1000),
      kind: 'artifact',
    }
  }
}
