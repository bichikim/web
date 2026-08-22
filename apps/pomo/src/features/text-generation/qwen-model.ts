// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {type ProgressInfo, Qwen3_5ForCausalLM} from '@huggingface/transformers'

import type {TextModelImplementation} from './model'

export type QwenTextGenerationModel = Awaited<ReturnType<typeof Qwen3_5ForCausalLM.from_pretrained>>

interface LoadQwenModelOptions {
  readonly model: TextModelImplementation
  readonly onProgress: (progress: ProgressInfo) => void
}

export const loadQwenModel = ({
  model,
  onProgress,
}: LoadQwenModelOptions): Promise<QwenTextGenerationModel> =>
  Qwen3_5ForCausalLM.from_pretrained(model.repositoryId, {
    device: 'webgpu',
    dtype: {
      decoder_model_merged: model.quantization,
      embed_tokens: model.quantization,
    },
    progress_callback: onProgress,
    revision: model.assetSource.revision,
  })
