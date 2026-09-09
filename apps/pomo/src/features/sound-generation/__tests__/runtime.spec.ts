/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {generateSound} from '../runtime'

vi.mock('@huggingface/transformers', () => ({PreTrainedTokenizer: vi.fn()}))
vi.mock('onnxruntime-web/webgpu', () => ({
  env: {wasm: {}},
  InferenceSession: {create: vi.fn()},
  Tensor: vi.fn(),
}))

afterEach(() => vi.unstubAllGlobals())

it.each([0, 121, 1.5, Number.NaN])(
  'should reject invalid duration %s before downloading',
  async (seconds) => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(generateSound('rain', seconds, vi.fn())).rejects.toThrow('1–120초')
    expect(fetcher).not.toHaveBeenCalled()
  },
)

it.each(['open', 'match', 'unavailable'])(
  'should download when cache access fails at %s',
  async (failure) => {
    const cache = {match: vi.fn().mockRejectedValue(new Error('storage denied'))}
    vi.stubGlobal(
      'caches',
      failure === 'unavailable'
        ? undefined
        : {
            open:
              failure === 'open'
                ? vi.fn().mockRejectedValue(new Error('storage denied'))
                : vi.fn().mockResolvedValue(cache),
          },
    )
    vi.stubGlobal('navigator', {
      gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
    })
    const fetcher = vi.fn().mockRejectedValue(new Error('network test boundary'))
    vi.stubGlobal('fetch', fetcher)
    await expect(generateSound('rain', 120, vi.fn())).rejects.toThrow('network test boundary')
    expect(fetcher).toHaveBeenCalledOnce()
  },
)
