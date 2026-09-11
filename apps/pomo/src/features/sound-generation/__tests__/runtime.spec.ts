/** @vitest-environment jsdom */
import {PreTrainedTokenizer} from '@huggingface/transformers'
import * as ort from 'onnxruntime-web/webgpu'
import {afterEach, expect, it, vi} from 'vitest'
import {loadAsset} from '../assets'
import {generateSound} from '../runtime'

vi.mock('../assets', () => ({
  ASSET_LABELS: {
    'onnx/sa3-sm-sfx/dit_fp16.onnx': 'DiT',
    'onnx/t5gemma/encoder.onnx': 'encoder',
    'tensorRT/sm_90/t5gemma/tokenizer.json': 'tokenizer',
  },
  loadAsset: vi.fn(),
}))
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

it('should dispose prompt tensors when the DiT session cannot load', async () => {
  const hidden = {dispose: vi.fn()}
  const tensors: Array<{dispose: () => void}> = []
  const encoder = {
    release: vi.fn(async () => {}),
    run: vi.fn(async () => ({hidden_states: hidden})),
  }
  vi.mocked(loadAsset).mockResolvedValue(new TextEncoder().encode('{}'))
  vi.mocked(PreTrainedTokenizer).mockImplementation(function PromptTokenizer() {
    return (() => ({
      attention_mask: {data: [1]},
      input_ids: {data: [1]},
    })) as never
  })
  vi.mocked(ort.Tensor).mockImplementation(function Tensor() {
    const tensor = {dispose: vi.fn()}
    tensors.push(tensor)
    return tensor as never
  })
  vi.mocked(ort.InferenceSession.create)
    .mockResolvedValueOnce(encoder as never)
    .mockRejectedValueOnce(new Error('DiT load failed'))
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn(async () => ({features: new Set(['shader-f16'])}))},
  })

  await expect(generateSound('rain', 1, vi.fn())).rejects.toThrow('DiT load failed')

  expect(hidden.dispose).toHaveBeenCalledOnce()
  expect(tensors.at(-1)?.dispose).toHaveBeenCalledOnce()
  expect(encoder.release).toHaveBeenCalledOnce()
})
