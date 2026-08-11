/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {
  AutoProcessor,
  env,
  type ProgressInfo,
  Qwen3_5ForCausalLM,
  TextStreamer,
} from '@huggingface/transformers'

import {getTextModelImplementation, type TextModelId} from './model'
import {createTextGenerationProgress} from './progress'
import type {
  CreateTextGenerationRuntimeOptions,
  GenerateTextOptions,
  TextGenerationMessage,
  TextGenerationRuntime,
  TextTokenVocabulary,
} from './runtime'
import {
  createModelStorage,
  createResumableModelFetch,
  createTransformersModelCache,
  reportModelStorageError,
} from '../model-storage'

const CHAT_TEMPLATE_OPTIONS = {
  add_generation_prompt: true,
  enable_thinking: false,
}

export const createQwenTransformersRuntime = (
  options: CreateTextGenerationRuntimeOptions,
): TextGenerationRuntime => {
  const resumableModelFetch = createResumableModelFetch()
  env.fetch = resumableModelFetch.fetch
  env.useBrowserCache = false
  env.useCustomCache = true
  env.customCache = createTransformersModelCache({
    onError: reportModelStorageError,
    onStored: resumableModelFetch.deletePartial,
    storage: createModelStorage(),
  })

  let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null
  let model: Awaited<ReturnType<typeof Qwen3_5ForCausalLM.from_pretrained>> | null = null
  let preparePromise: Promise<void> | null = null
  let activeModelId: TextModelId | null = null

  const reportProgress = (progress: ProgressInfo) => {
    if (progress.status !== 'progress_total') {
      return
    }

    options.onProgress(
      createTextGenerationProgress({
        files: progress.files,
        loadedBytes: progress.loaded,
        totalBytes: progress.total,
      }),
    )
  }

  const prepare = async (modelId: TextModelId) => {
    if (activeModelId !== null && activeModelId !== modelId) {
      throw new Error('다른 텍스트 모델을 사용하려면 실행 세션을 다시 시작해야 해요.')
    }

    if (processor !== null && model !== null) {
      return
    }

    if (preparePromise === null) {
      activeModelId = modelId
      const modelDefinition = getTextModelImplementation(modelId)
      preparePromise = (async () => {
        const [nextProcessor, nextModel] = await Promise.all([
          AutoProcessor.from_pretrained(modelDefinition.repositoryId),
          Qwen3_5ForCausalLM.from_pretrained(modelDefinition.repositoryId, {
            device: 'webgpu',
            dtype: {
              decoder_model_merged: 'q4',
              embed_tokens: 'q4',
            },
            progress_callback: reportProgress,
          }),
        ])

        processor = nextProcessor
        model = nextModel
      })()
    }

    try {
      await preparePromise
    } catch (error) {
      processor = null
      model = null
      preparePromise = null
      activeModelId = null
      throw error
    }
  }

  const getProcessorTokenizer = () => {
    const tokenizer = processor?.tokenizer

    if (tokenizer === undefined) {
      throw new Error('텍스트 모델 토크나이저가 준비되지 않았어요.')
    }

    return tokenizer
  }

  const getTokenizer = (): TextTokenVocabulary => getProcessorTokenizer()

  const createPrompt = (messages: Array<TextGenerationMessage>) => {
    if (processor === null) {
      throw new Error('텍스트 모델 프로세서가 준비되지 않았어요.')
    }

    return processor.apply_chat_template(messages, CHAT_TEMPLATE_OPTIONS)
  }

  const countTokens = async (messages: Array<TextGenerationMessage>) => {
    if (processor === null) {
      throw new Error('텍스트 모델 프로세서가 준비되지 않았어요.')
    }

    const inputs = await processor(createPrompt(messages))
    return inputs.input_ids.dims.at(-1) ?? 0
  }

  const generate = async (generationOptions: GenerateTextOptions) => {
    if (processor === null || model === null) {
      throw new Error('텍스트 모델이 준비되지 않았어요.')
    }

    const tokenizer = getProcessorTokenizer()
    const inputs = await processor(createPrompt(generationOptions.messages))
    let output = ''

    await model.generate({
      ...inputs,
      do_sample: true,
      max_new_tokens: generationOptions.maximumTokens,
      no_repeat_ngram_size: generationOptions.noRepeatNgramSize,
      repetition_penalty: generationOptions.repetitionPenalty,
      streamer: new TextStreamer(tokenizer, {
        callback_function: (text) => {
          output += text
          generationOptions.onToken?.(text)
        },
        skip_prompt: true,
        skip_special_tokens: true,
      }),
      suppress_tokens: generationOptions.suppressedTokenIds,
      temperature: generationOptions.temperature,
      top_k: generationOptions.topK,
      top_p: generationOptions.topP,
    })

    return output
  }

  return {countTokens, generate, getTokenizer, prepare}
}
