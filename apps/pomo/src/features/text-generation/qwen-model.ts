// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {type ProgressInfo, Qwen3_5ForCausalLM} from '@huggingface/transformers'

import type {TransformersTextModelImplementation} from './model'
import {createTransformersLoadOptions} from './create-transformers-load-options'

export type QwenTextGenerationModel = Awaited<ReturnType<typeof Qwen3_5ForCausalLM.from_pretrained>>

interface LoadQwenModelOptions {
  readonly model: TransformersTextModelImplementation
  readonly onProgress: (progress: ProgressInfo) => void
}

export const loadQwenModel = ({
  model,
  onProgress,
}: LoadQwenModelOptions): Promise<QwenTextGenerationModel> =>
  Qwen3_5ForCausalLM.from_pretrained(
    model.repositoryId,
    createTransformersLoadOptions({model, onProgress}),
  )
