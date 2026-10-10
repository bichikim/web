/** @vitest-environment node */
// oxlint-disable eslint-js/camelcase -- Transformers.js options follow its external contract.
import {afterEach, expect, it, vi} from 'vitest'
import type {TransformersTextModelImplementation} from '../model'

const fromPretrained = vi.hoisted(() => vi.fn())
vi.mock('@huggingface/transformers', () => ({
  Qwen3_5ForCausalLM: {from_pretrained: fromPretrained},
}))

import {loadQwenModel} from '../qwen-model'

const model: TransformersTextModelImplementation = {
  architecture: 'qwen-3.5',
  assetSource: {
    host: 'https://models.test/',
    pathTemplate: '{model}/{revision}/',
    revision: 'pinned',
  },
  description: 'Qwen',
  downloadSize: '450MB',
  id: 'qwen-0.8b',
  label: 'Qwen',
  quantization: 'q4',
  repositoryId: 'repository/qwen',
}

afterEach(() => vi.resetAllMocks())

it.each(['q4', 'q2f16'] as const)(
  'should forward %s session options and the original loader promise',
  (quantization) => {
    const onProgress = vi.fn()
    const session = Promise.resolve({generate: vi.fn()})
    fromPretrained.mockReturnValue(session)

    expect(loadQwenModel({model: {...model, quantization}, onProgress})).toBe(session)
    expect(fromPretrained).toHaveBeenCalledExactlyOnceWith('repository/qwen', {
      device: 'webgpu',
      dtype: {decoder_model_merged: quantization, embed_tokens: quantization},
      progress_callback: onProgress,
      revision: 'pinned',
    })
  },
)

it('should preserve the model loading rejection', async () => {
  const error = new Error('model unavailable')
  fromPretrained.mockRejectedValue(error)

  await expect(loadQwenModel({model, onProgress: vi.fn()})).rejects.toBe(error)
})
