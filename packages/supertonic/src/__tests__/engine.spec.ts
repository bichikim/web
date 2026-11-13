/** @vitest-environment node */
// oxlint-disable no-magic-numbers -- Compact model fixtures intentionally use explicit tensor dimensions.
import * as runtime from 'onnxruntime-web/wasm'
import type {InferenceSession, Tensor} from 'onnxruntime-web/wasm'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  parseSupertonicConfig,
  parseSupertonicIndexer,
  parseSupertonicVoice,
  SupertonicEngine,
  type SupertonicEngineSessions,
} from '@winter-love/supertonic/engine'
import type {Result} from '@winter-love/supertonic/result'

const createConfig = () => ({
  ae: {base_chunk_size: 2, sample_rate: 4},
  ttl: {chunk_compress_factor: 1, latent_dim: 1},
})

afterEach(() => vi.restoreAllMocks())

const createSession = (
  run: InferenceSession['run'],
): SupertonicEngineSessions['durationPredictor'] => ({release: vi.fn(async () => undefined), run})

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
    expect(parseSupertonicConfig({})).toMatchObject({
      error: {asset: 'config', code: 'invalid-model-data'},
      ok: false,
    })
    expect(parseSupertonicIndexer({65: 1})).toEqual({
      error: {asset: 'indexer', code: 'invalid-model-data', phase: 'validate', retryable: false},
      ok: false,
    })
  })

  it('should parse nested voice data into float tensors', () => {
    const voice = getResultValue(
      parseSupertonicVoice(runtime, {
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
      parseSupertonicVoice(runtime, {
        style_dp: {data: ['invalid'], dims: [1]},
        style_ttl: {data: [0], dims: [0]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
    expect(
      parseSupertonicVoice(runtime, {
        style_dp: {data: ['invalid'], dims: [1]},
        style_ttl: {data: [0], dims: [1]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
    expect(
      parseSupertonicVoice(runtime, {
        style_dp: {data: [0], dims: [1, 2]},
        style_ttl: {data: [0], dims: [1]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
  })
})

describe('SupertonicEngine', () => {
  it('should pass normalized Unicode with its language tag to both text models', async () => {
    const durationRun = vi.fn(async (_feeds: Record<string, Tensor>) => ({
      duration: new runtime.Tensor('float32', Float32Array.of(1), [1]),
    }))
    const textRun = vi.fn(async (_feeds: Record<string, Tensor>) => ({
      text_emb: new runtime.Tensor('float32', Float32Array.of(1), [1]),
    }))
    const sessions: ConstructorParameters<typeof SupertonicEngine>[2] = {
      durationPredictor: createSession(durationRun),
      textEncoder: createSession(textRun),
      vectorEstimator: createSession(
        vi.fn(async () => ({
          denoised_latent: new runtime.Tensor('float32', Float32Array.of(0, 0), [1, 1, 2]),
        })),
      ),
      vocoder: createSession(
        vi.fn(async () => ({
          wav_tts: new runtime.Tensor('float32', Float32Array.of(0), [1, 1, 1]),
        })),
      ),
    }
    const engine = new SupertonicEngine(
      getResultValue(parseSupertonicConfig(createConfig())),
      Array.from({length: 0x2800}, (_, index) => index),
      sessions,
      runtime,
    )
    const voice = getResultValue(
      parseSupertonicVoice(runtime, {
        style_dp: {data: [0], dims: [1]},
        style_ttl: {data: [0], dims: [1]},
      }),
    )

    try {
      await engine.generate({
        language: 'ko',
        onProgress: vi.fn(),
        speed: 1,
        text: '  “é–한글😀”\n',
        voice,
      })
      const expected = '<ko>"e\u0301-\u1112\u1161\u11ab\u1100\u1173\u11af"</ko>'
      const expectedIds = BigInt64Array.from(
        Array.from(expected, (value) => BigInt(value.codePointAt(0) ?? 0)),
      )

      expect(durationRun.mock.calls[0]?.[0].text_ids.data).toEqual(expectedIds)
      expect(textRun.mock.calls[0]?.[0].text_ids.data).toEqual(expectedIds)
    } finally {
      await engine.release()
    }
  })

  it('should execute duration, text, eight denoising steps, and vocoder in order', async () => {
    let draws = 0
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      draws += 1
      return draws % 2 === 1 ? Math.exp(-0.5) : 0.5
    })
    const durationRun = vi.fn(async (_feeds: Record<string, Tensor>) => ({
      duration: new runtime.Tensor('float32', Float32Array.of(1), [1]),
    }))
    const textRun = vi.fn(async () => ({
      text_emb: new runtime.Tensor('float32', Float32Array.of(1), [1]),
    }))
    const vectorRun = vi.fn(async (feeds: Record<string, Tensor>) => {
      if (vectorRun.mock.calls.length === 1) {
        expect(feeds.noisy_latent.data).toEqual(Float32Array.of(-1, -1))
        expect(random).toHaveBeenCalledTimes(4)
      }
      return {
        denoised_latent: new runtime.Tensor('float32', Float32Array.of(0, 0), [1, 1, 2]),
      }
    })
    const vocoderRun = vi.fn(async () => ({
      wav_tts: new runtime.Tensor('float32', Float32Array.of(0.1, 0.2, 0.3, 0.4), [1, 1, 4]),
    }))
    const sessions: SupertonicEngineSessions = {
      durationPredictor: createSession(durationRun),
      textEncoder: createSession(textRun),
      vectorEstimator: createSession(vectorRun),
      vocoder: createSession(vocoderRun),
    }
    const engine = new SupertonicEngine(
      getResultValue(parseSupertonicConfig(createConfig())),
      getResultValue(parseSupertonicIndexer(Array.from({length: 128}, (_, index) => index))),
      sessions,
      runtime,
    )
    const onProgress = vi.fn()
    const voice = getResultValue(
      parseSupertonicVoice(runtime, {
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
    expect(random).toHaveBeenCalledTimes(4)
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
    const sparseIndexer: number[] = []
    sparseIndexer.length = 128
    const sessions: SupertonicEngineSessions = {
      durationPredictor: createSession(
        vi.fn(async () => ({
          duration: new runtime.Tensor('int64', BigInt64Array.of(1n), [1]),
        })),
      ),
      textEncoder: createSession(vi.fn()),
      vectorEstimator: createSession(vi.fn()),
      vocoder: createSession(vi.fn()),
    }
    const engine = new SupertonicEngine(
      getResultValue(parseSupertonicConfig(createConfig())),
      sparseIndexer,
      sessions,
      runtime,
    )
    const voice = getResultValue(
      parseSupertonicVoice(runtime, {
        style_dp: {data: [0], dims: [1]},
        style_ttl: {data: [0], dims: [1]},
      }),
    )

    await expect(
      engine.generate({language: 'ko', onProgress: vi.fn(), speed: 1, text: '안녕!', voice}),
    ).rejects.toThrow('Supertonic 모델이 예상하지 못한 결과를 반환했어요')
  })
})

it('should cancel between steps and reuse sessions for the next generation', async () => {
  const sessions: SupertonicEngineSessions = {
    durationPredictor: createSession(
      vi.fn().mockResolvedValue({duration: new runtime.Tensor('float32', Float32Array.of(1), [1])}),
    ),
    textEncoder: createSession(
      vi.fn().mockResolvedValue({text_emb: new runtime.Tensor('float32', Float32Array.of(1), [1])}),
    ),
    vectorEstimator: createSession(
      vi.fn().mockResolvedValue({
        denoised_latent: new runtime.Tensor('float32', Float32Array.of(0, 0), [1, 1, 2]),
      }),
    ),
    vocoder: createSession(
      vi.fn().mockResolvedValue({
        wav_tts: new runtime.Tensor('float32', Float32Array.of(0.1, 0.2, 0.3, 0.4), [1, 1, 4]),
      }),
    ),
  }
  const engine = new SupertonicEngine(
    getResultValue(parseSupertonicConfig(createConfig())),
    getResultValue(parseSupertonicIndexer(Array.from({length: 128}, (_, index) => index))),
    sessions,
    runtime,
  )
  const voice = getResultValue(
    parseSupertonicVoice(runtime, {
      style_dp: {data: [0], dims: [1]},
      style_ttl: {data: [0], dims: [1]},
    }),
  )
  const controller = new AbortController()
  const options = {language: 'en' as const, speed: 1, text: 'Hello', voice}
  await expect(
    engine.generate({
      ...options,
      onProgress: async () => {
        controller.abort()
      },
      signal: controller.signal,
    }),
  ).rejects.toMatchObject({name: 'AbortError'})
  expect(sessions.vectorEstimator.run).not.toHaveBeenCalled()
  expect(sessions.durationPredictor.release).not.toHaveBeenCalled()
  await expect(engine.generate({...options, onProgress: () => undefined})).resolves.toHaveLength(4)
  expect(sessions.vectorEstimator.run).toHaveBeenCalledTimes(8)
  await engine.release()
})
