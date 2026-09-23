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
  const hiddenData = new Float32Array([0])
  const hidden = {
    data: hiddenData,
    dims: [1, 1, 1],
    dispose: vi.fn(),
    getData: vi.fn(async () => hiddenData),
    type: 'float32',
  }
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

it('should encode the negative prompt and run classifier-free guidance for every step', async () => {
  const createHidden = (value: number) => {
    const data = new Float32Array([value])
    return {
      data,
      dims: [1, 1, 1],
      dispose: vi.fn(),
      getData: vi.fn(async () => data),
      type: 'float32',
    }
  }
  const positiveHidden = createHidden(1)
  const negativeHidden = createHidden(2)
  const encoder = {
    release: vi.fn(async () => {}),
    run: vi
      .fn()
      .mockResolvedValueOnce({hidden_states: positiveHidden})
      .mockResolvedValueOnce({hidden_states: negativeHidden}),
  }
  const ditRun = vi.fn(async (_inputs: unknown) => ({
    velocity: {data: new Float32Array(2816), dispose: vi.fn()},
  }))
  const dit = {
    release: vi.fn(async () => {}),
    run: ditRun,
  }
  const decoder = {
    release: vi.fn(async () => {}),
    run: vi.fn(async () => ({
      pcm: {data: new Int32Array(88200), dispose: vi.fn()},
    })),
  }
  const prompts: string[] = []
  vi.mocked(loadAsset).mockResolvedValue(new TextEncoder().encode('{}'))
  vi.mocked(PreTrainedTokenizer).mockImplementation(function PromptTokenizer() {
    return ((prompt: string) => {
      prompts.push(prompt)
      return {
        attention_mask: {data: new Array(256).fill(1)},
        input_ids: {data: new Array(256).fill(1)},
      }
    }) as never
  })
  vi.mocked(ort.Tensor).mockImplementation(function Tensor(...args: unknown[]) {
    const [type, data, dims] = args as [string, unknown, readonly number[]]
    return {
      data,
      dims,
      dispose: vi.fn(),
      getData: vi.fn(async () => data),
      type,
    } as never
  })
  vi.mocked(ort.InferenceSession.create)
    .mockResolvedValueOnce(encoder as never)
    .mockResolvedValueOnce(dit as never)
    .mockResolvedValueOnce(decoder as never)
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn(async () => ({features: new Set(['shader-f16'])}))},
  })

  await generateSound('thunder', 1, vi.fn(), {negativePrompt: 'rain, rainfall'})

  expect(prompts).toEqual(['thunder', 'rain, rainfall'])
  expect(encoder.run).toHaveBeenCalledTimes(2)
  expect(dit.run).toHaveBeenCalledTimes(16)
  const positiveConditioning = ditRun.mock.calls[0]?.[0] as {t5_hidden: typeof positiveHidden}
  const negativeConditioning = ditRun.mock.calls[1]?.[0] as {t5_hidden: typeof negativeHidden}
  expect(positiveConditioning.t5_hidden).not.toBe(positiveHidden)
  expect(negativeConditioning.t5_hidden).not.toBe(negativeHidden)
  expect(Array.from(positiveConditioning.t5_hidden.data)).toEqual([1])
  expect(Array.from(negativeConditioning.t5_hidden.data)).toEqual([2])
})
