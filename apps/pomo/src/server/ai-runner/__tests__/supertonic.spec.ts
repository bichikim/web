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

describe('Supertonic runner audio', () => {
  it('should preserve ordered PCM and floor the inter-chunk silence in its WAV result', async () => {
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
        .mockImplementation(async (feeds: Record<string, {readonly data: Float32Array}>) => ({
          denoised_latent: feeds.noisy_latent,
        })),
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
    expect(audio.sampleRate).toBe(sampleRate)
    expect(audio.samples).toHaveLength(2_404)
    expect(audio.samples[0]).toBeCloseTo(0.5, 4)
    expect(audio.samples.at(-1)).toBe(-0.5)
    expect(audio.samples.slice(1, -1)).toEqual(new Float32Array(2_402))
    expect(result.durationMs).toBe(300)
    expect(result.contentType).toBe('audio/wav')
    expect(progress).toHaveBeenLastCalledWith(100)
  })
})
