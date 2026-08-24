// oxlint-disable no-magic-numbers -- Compact model fixtures intentionally use explicit tensor dimensions.
import {type InferenceSession, Tensor} from 'onnxruntime-web/all'
import {describe, expect, it, vi} from 'vitest'

import {
  parseSupertonicConfig,
  parseSupertonicIndexer,
  parseSupertonicVoice,
  SupertonicEngine,
  type SupertonicSessions,
} from '../engine'
import type {Result} from '../../result'

const createConfig = () => ({
  ae: {base_chunk_size: 2, sample_rate: 4},
  ttl: {chunk_compress_factor: 1, latent_dim: 1},
})

const createSession = (run: ReturnType<typeof vi.fn>) =>
  ({release: vi.fn(async () => undefined), run}) as unknown as InferenceSession

const getResultValue = <Value>(result: Result<Value, unknown>): Value => {
  if (!result.ok) {
    throw new Error('테스트 준비 값이 유효하지 않습니다.')
  }

  return result.value
}

describe('Supertonic parsers', () => {
  it('should parse model configuration and array-based Unicode indexers', () => {
    expect(parseSupertonicConfig(createConfig())).toEqual({ok: true, value: createConfig()})
    expect(parseSupertonicIndexer([-1, 0, 7])).toEqual({ok: true, value: [-1, 0, 7]})
  })

  it('should reject the obsolete record indexer format', () => {
    expect(parseSupertonicIndexer({65: 1})).toEqual({
      error: {asset: 'indexer', code: 'invalid-model-data', phase: 'validate', retryable: false},
      ok: false,
    })
  })

  it('should parse nested voice data into float tensors', () => {
    const voice = getResultValue(
      parseSupertonicVoice({
        style_dp: {data: [[0.1, 0.2]], dims: [1, 2]},
        style_ttl: {data: [[[0.3]]], dims: [1, 1, 1]},
      }),
    )

    expect(voice.durationStyle.dims).toEqual([1, 2])
    expect(Array.from(voice.durationStyle.data as Float32Array)).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
    ])
    expect(voice.speechStyle.dims).toEqual([1, 1, 1])
  })

  it('should reject invalid voice dimensions and nonnumeric data', () => {
    expect(
      parseSupertonicVoice({
        style_dp: {data: ['invalid'], dims: [1]},
        style_ttl: {data: [0], dims: [0]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
    expect(
      parseSupertonicVoice({
        style_dp: {data: ['invalid'], dims: [1]},
        style_ttl: {data: [0], dims: [1]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
    expect(
      parseSupertonicVoice({
        style_dp: {data: [0], dims: [1, 2]},
        style_ttl: {data: [0], dims: [1]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
  })
})

describe('SupertonicEngine', () => {
  it('should execute duration, text, eight denoising steps, and vocoder in order', async () => {
    const durationRun = vi.fn(async (_feeds: Record<string, Tensor>) => ({
      duration: new Tensor('float32', Float32Array.of(1), [1]),
    }))
    const textRun = vi.fn(async () => ({
      text_emb: new Tensor('float32', Float32Array.of(1), [1]),
    }))
    const vectorRun = vi.fn(async () => ({
      denoised_latent: new Tensor('float32', Float32Array.of(0, 0), [1, 1, 2]),
    }))
    const vocoderRun = vi.fn(async () => ({
      wav_tts: new Tensor('float32', Float32Array.of(0.1, 0.2, 0.3, 0.4), [1, 1, 4]),
    }))
    const sessions: SupertonicSessions = {
      durationPredictor: createSession(durationRun),
      textEncoder: createSession(textRun),
      vectorEstimator: createSession(vectorRun),
      vocoder: createSession(vocoderRun),
    }
    const engine = new SupertonicEngine(
      getResultValue(parseSupertonicConfig(createConfig())),
      getResultValue(parseSupertonicIndexer(Array.from({length: 128}, (_, index) => index))),
      sessions,
    )
    const onProgress = vi.fn()
    const voice = getResultValue(
      parseSupertonicVoice({
        style_dp: {data: [0], dims: [1]},
        style_ttl: {data: [0], dims: [1]},
      }),
    )

    const samples = await engine.generate({
      language: 'en',
      onProgress,
      speed: 1,
      text: 'Hello',
      voice,
    })

    const durationInput = durationRun.mock.calls[0]?.[0]
    const textIds = durationInput?.text_ids

    if (!(textIds?.data instanceof BigInt64Array)) {
      throw new Error('언어 태그가 텍스트 텐서에 포함되지 않았습니다.')
    }

    expect(String.fromCodePoint(...Array.from(textIds.data, Number))).toBe('<en>Hello.</en>')
    expect(durationRun).toHaveBeenCalledTimes(1)
    expect(textRun).toHaveBeenCalledTimes(1)
    expect(vectorRun).toHaveBeenCalledTimes(8)
    expect(vocoderRun).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledTimes(8)
    expect(Array.from(samples)).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
      expect.closeTo(0.3),
      expect.closeTo(0.4),
    ])

    await engine.release()
    expect(sessions.durationPredictor.release).toHaveBeenCalledTimes(1)
    expect(sessions.textEncoder.release).toHaveBeenCalledTimes(1)
    expect(sessions.vectorEstimator.release).toHaveBeenCalledTimes(1)
    expect(sessions.vocoder.release).toHaveBeenCalledTimes(1)
  })

  it('should reject non-float model outputs', async () => {
    const sessions: SupertonicSessions = {
      durationPredictor: createSession(
        vi.fn(async () => ({duration: new Tensor('int64', BigInt64Array.of(1n), [1])})),
      ),
      textEncoder: createSession(vi.fn()),
      vectorEstimator: createSession(vi.fn()),
      vocoder: createSession(vi.fn()),
    }
    const engine = new SupertonicEngine(
      getResultValue(parseSupertonicConfig(createConfig())),
      getResultValue(parseSupertonicIndexer([])),
      sessions,
    )
    const voice = getResultValue(
      parseSupertonicVoice({
        style_dp: {data: [0], dims: [1]},
        style_ttl: {data: [0], dims: [1]},
      }),
    )

    await expect(
      engine.generate({language: 'ko', onProgress: vi.fn(), speed: 1, text: '안녕', voice}),
    ).rejects.toThrow('Supertonic 모델이 예상하지 못한 결과를 반환했어요')
  })
})
