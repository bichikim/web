/** @vitest-environment node */
// oxlint-disable eslint-js/camelcase -- Transformers.js options follow its external contract.
import {expect, it, vi} from 'vitest'
import {createTransformersLoadOptions} from '../create-transformers-load-options'
import type {TransformersTextModelImplementation} from '../model'

const architectures = ['lfm-2', 'gemma-4', 'qwen-3.5'] as const
const quantizations = ['q4', 'q2f16'] as const

it.each(
  architectures.flatMap((architecture) =>
    quantizations.map((quantization) => ({architecture, quantization})),
  ),
)(
  'should derive $architecture $quantization options without mutating the model or calling progress',
  ({architecture, quantization}) => {
    const assetSource = Object.freeze({
      host: 'https://models.test/',
      pathTemplate: '{model}/{revision}/',
      revision: 'pinned',
    })
    const model = Object.freeze({architecture, assetSource, quantization}) satisfies Pick<
      TransformersTextModelImplementation,
      'architecture' | 'assetSource' | 'quantization'
    >
    const onProgress = vi.fn()

    expect(createTransformersLoadOptions({model, onProgress})).toEqual({
      device: 'webgpu',
      dtype:
        architecture === 'lfm-2'
          ? quantization
          : {decoder_model_merged: quantization, embed_tokens: quantization},
      progress_callback: onProgress,
      revision: 'pinned',
    })
    expect(onProgress).not.toHaveBeenCalled()
    expect(model).toEqual({architecture, assetSource, quantization})
  },
)
