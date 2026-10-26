/** @vitest-environment node */
import {InferenceSession, Tensor} from 'onnxruntime-node'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {decodePcmWav} from '../audio'
import {createSupertonicExecutor} from '../supertonic'

vi.mock('onnxruntime-node', () => ({
  InferenceSession: {create: vi.fn()},
  Tensor: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Supertonic runner assets', () => {
  const sharedBase = 'https://storage.pomofi.io/models/supertonic-3/3cadd1e'

  it.each([
    {
      modelBase: sharedBase,
      modelId: 'supertonic-full',
      modelPaths: [
        'onnx/duration_predictor.onnx',
        'onnx/text_encoder.onnx',
        'onnx/vector_estimator.onnx',
        'onnx/vocoder.onnx',
      ],
    },
    {
      modelBase:
        'https://storage.pomofi.io/models/supertonic-3-int8/cca5a0e6c96e1d2c720986bf7e75fcc81dee3ae4',
      modelId: 'supertonic-int8',
      modelPaths: [
        'duration_predictor.int8.onnx',
        'text_encoder.int8.onnx',
        'vector_estimator.int8.onnx',
        'vocoder.int8.onnx',
      ],
    },
  ] as const)(
    'should request the pinned assets for $modelId before propagating session creation failure',
    async ({modelBase, modelId, modelPaths}) => {
      const modelUrls = modelPaths.map((path) => `${modelBase}/${path}`)
      const fetch = vi.fn(async (url: string, _options?: RequestInit) => {
        if (url === `${sharedBase}/onnx/tts.json`) {
          return Response.json({
            ae: {base_chunk_size: 1, sample_rate: 8_000},
            ttl: {chunk_compress_factor: 1, latent_dim: 1},
          })
        }
        if (url === `${sharedBase}/onnx/unicode_indexer.json`) {
          return Response.json([])
        }
        if (modelUrls.includes(url)) {
          return new Response(new Uint8Array())
        }
        throw new Error(`Unexpected asset URL: ${url}`)
      })
      vi.stubGlobal('fetch', fetch)
      const failure = new Error('session unavailable')
      vi.mocked(InferenceSession.create).mockRejectedValueOnce(failure)
      const signal = new AbortController().signal
      const onProgress = vi.fn()
      const execute = createSupertonicExecutor()

      await expect(
        execute(modelId, {text: 'hello', voiceId: 'F1'}, {onProgress, signal}),
      ).rejects.toBe(failure)

      expect(fetch.mock.calls.map(([url]) => url)).toEqual([
        `${sharedBase}/onnx/tts.json`,
        `${sharedBase}/onnx/unicode_indexer.json`,
        ...modelUrls,
      ])
      expect(fetch.mock.calls.every(([, options]) => options?.signal === signal)).toBe(true)
      expect(InferenceSession.create).toHaveBeenCalledExactlyOnceWith(new Uint8Array(), {
        executionProviders: ['cpu'],
      })
      expect(onProgress.mock.calls).toEqual([[5], [12], [38]])
    },
  )
})

describe('Supertonic runner audio', () => {
  it('should preserve ordered PCM and floor the inter-chunk silence in its WAV result', async () => {
    let draws = 0
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      draws += 1
      return draws % 2 === 1 ? Math.exp(-0.5) : 0.5
    })
    const sampleRate = 8_009
    function createTensor(...parameters: ReadonlyArray<unknown>) {
      return {data: parameters[1]}
    }
    vi.mocked(Tensor).mockImplementation(createTensor as unknown as typeof Tensor)
    const duration = {run: vi.fn().mockResolvedValue({duration: {data: Float32Array.of(0.01)}})}
    const text = {run: vi.fn().mockResolvedValue({text_emb: {data: Float32Array.of(0)}})}
    const vector = {
      run: vi
        .fn()
        .mockImplementation(async (feeds: Record<string, {readonly data: Float32Array}>) => {
          expect(feeds.noisy_latent.data).toEqual(new Float32Array(81).fill(-1))
          return {denoised_latent: feeds.noisy_latent}
        }),
    }
    const vocoder = {
      run: vi
        .fn()
        .mockResolvedValueOnce({wav_tts: {data: Float32Array.of(0.5)}})
        .mockResolvedValueOnce({wav_tts: {data: Float32Array.of(-0.5)}}),
    }
    vi.mocked(InferenceSession.create)
      .mockResolvedValueOnce(duration as unknown as InferenceSession)
      .mockResolvedValueOnce(text as unknown as InferenceSession)
      .mockResolvedValueOnce(vector as unknown as InferenceSession)
      .mockResolvedValueOnce(vocoder as unknown as InferenceSession)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('tts.json')) {
          return Response.json({
            ae: {base_chunk_size: 1, sample_rate: sampleRate},
            ttl: {chunk_compress_factor: 1, latent_dim: 1},
          })
        }
        if (url.endsWith('unicode_indexer.json')) {
          return Response.json([])
        }
        if (url.endsWith('sarah.json')) {
          return Response.json({
            style_dp: {data: [0], dims: [1]},
            style_ttl: {data: [0], dims: [1]},
          })
        }
        return new Response(new Uint8Array())
      }),
    )
    const progress = vi.fn()
    const execute = createSupertonicExecutor()
    const result = await execute(
      'supertonic-int8',
      {text: `${'가'.repeat(80)}. ${'나'.repeat(80)}.`, voiceId: 'F1'},
      {onProgress: progress, signal: new AbortController().signal},
    )
    const audio = decodePcmWav(result.bytes)

    expect(vocoder.run).toHaveBeenCalledTimes(2)
    expect(random).toHaveBeenCalledTimes(324)
    expect(audio.sampleRate).toBe(sampleRate)
    expect(audio.samples).toHaveLength(2_404)
    expect(audio.samples[0]).toBeCloseTo(0.5, 4)
    expect(audio.samples.at(-1)).toBe(-0.5)
    expect(audio.samples.slice(1, -1)).toEqual(new Float32Array(2_402))
    expect(result.durationMs).toBe(300)
    expect(result.contentType).toBe('audio/wav')
    expect(progress).toHaveBeenLastCalledWith(100)
    expect(fetch).toHaveBeenCalledWith(
      'https://storage.pomofi.io/models/supertonic-3/3cadd1e/voice-styles/sarah.json',
      {signal: expect.any(AbortSignal)},
    )
  })
})
