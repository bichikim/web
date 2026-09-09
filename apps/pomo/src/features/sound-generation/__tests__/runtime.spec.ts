/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {loadAsset} from '../assets'
import {generateSound} from '../runtime'

vi.mock('../assets', () => ({loadAsset: vi.fn()}))
vi.mock('@huggingface/transformers', () => ({PreTrainedTokenizer: vi.fn()}))
vi.mock('onnxruntime-web/webgpu', () => ({
  env: {wasm: {}},
  InferenceSession: {create: vi.fn()},
  Tensor: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it.each([0, 121, 1.5, Number.NaN])(
  'should reject invalid duration %s before downloading',
  async (seconds) => {
    await expect(generateSound('rain', seconds, vi.fn())).rejects.toThrow('1–120초')
    expect(loadAsset).not.toHaveBeenCalled()
  },
)
