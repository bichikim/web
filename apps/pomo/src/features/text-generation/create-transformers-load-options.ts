// oxlint-disable eslint-js/camelcase -- Transformers.js options follow its external contract.
import type {PretrainedModelOptions, ProgressInfo} from '@huggingface/transformers'
import type {TransformersTextModelImplementation} from './model'

export interface CreateTransformersLoadOptionsOptions {
  readonly model: Pick<
    TransformersTextModelImplementation,
    'architecture' | 'assetSource' | 'quantization'
  >
  readonly onProgress: (progress: ProgressInfo) => void
}

export interface TransformersLoadOptions extends Required<
  Pick<PretrainedModelOptions, 'device' | 'dtype' | 'progress_callback' | 'revision'>
> {}

const getModelDtype = (
  model: CreateTransformersLoadOptionsOptions['model'],
): TransformersLoadOptions['dtype'] => {
  const {architecture, quantization} = model
  switch (architecture) {
    case 'lfm-2':
      return quantization
    case 'gemma-4':
    case 'qwen-3.5':
      return {decoder_model_merged: quantization, embed_tokens: quantization}
  }
  architecture satisfies never
}

/** Derives WebGPU loader options from an ONNX model's architecture and asset revision. */
export const createTransformersLoadOptions = ({
  model,
  onProgress,
}: CreateTransformersLoadOptionsOptions): TransformersLoadOptions => ({
  device: 'webgpu',
  dtype: getModelDtype(model),
  progress_callback: onProgress,
  revision: model.assetSource.revision,
})
