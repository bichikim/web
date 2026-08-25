/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {
  AutoProcessor,
  env,
  Gemma4ForCausalLM,
  type ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'

import {getTextModelImplementation, type TextModelId, type TextModelImplementation} from './model'
import {createTextGenerationProgress} from './progress'
import type {QwenTextGenerationModel} from './qwen-model'
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
  tokenize: false,
}
const GEMMA_TOKENIZER_CACHE_MIGRATION_VERSION = 1

type TextGenerationModel =
  | Awaited<ReturnType<typeof Gemma4ForCausalLM.from_pretrained>>
  | QwenTextGenerationModel

const loadModel = (
  modelDefinition: TextModelImplementation,
  reportProgress: (progress: ProgressInfo) => void,
): Promise<TextGenerationModel> => {
  const loadOptions = {
    device: 'webgpu',
    dtype: {
      decoder_model_merged: modelDefinition.quantization,
      embed_tokens: modelDefinition.quantization,
    },
    progress_callback: reportProgress,
    revision: modelDefinition.assetSource.revision,
  } as const

  switch (modelDefinition.architecture) {
    case 'gemma-4':
      return Gemma4ForCausalLM.from_pretrained(modelDefinition.repositoryId, loadOptions)
    case 'qwen-3.5': {
      return import('./qwen-model').then(({loadQwenModel}) =>
        loadQwenModel({model: modelDefinition, onProgress: reportProgress}),
      )
    }
  }
}

export const createTransformersRuntime = (
  options: CreateTextGenerationRuntimeOptions,
): TextGenerationRuntime => {
  const resumableModelFetch = createResumableModelFetch()
  const versionedCacheKeys = new Map<string, string>()
  env.fetch = resumableModelFetch.fetch
  env.useBrowserCache = false
  env.useCustomCache = true
  env.customCache = createTransformersModelCache({
    getStorageKey: (request) => versionedCacheKeys.get(request) ?? request,
    onError: reportModelStorageError,
    onStored: resumableModelFetch.deletePartial,
    storage: createModelStorage(),
  })

  let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null
  let model: TextGenerationModel | null = null
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
      const {assetSource} = modelDefinition
      env.allowLocalModels = false
      env.allowRemoteModels = true
      env.remoteHost = assetSource.host
      env.remotePathTemplate = assetSource.pathTemplate
      preparePromise = (async () => {
        if (modelId === 'gemma-4-e2b') {
          const modelPath = assetSource.pathTemplate
            .replaceAll('{model}', modelDefinition.repositoryId)
            .replaceAll('{revision}', assetSource.revision)
          const tokenizerUrl = new URL(`${modelPath}tokenizer.json`, assetSource.host).href
          versionedCacheKeys.set(
            tokenizerUrl,
            `${tokenizerUrl}?pomo-cache-version=${GEMMA_TOKENIZER_CACHE_MIGRATION_VERSION}`,
          )
        }
        const processorPromise = AutoProcessor.from_pretrained(modelDefinition.repositoryId, {
          revision: assetSource.revision,
        })
        const modelPromise = loadModel(modelDefinition, reportProgress)
        const [nextProcessor, nextModel] = await Promise.all([processorPromise, modelPromise])

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
    const prompt = processor!.apply_chat_template(messages, CHAT_TEMPLATE_OPTIONS)

    if (typeof prompt !== 'string') {
      throw new Error('텍스트 모델 프롬프트를 문자열로 만들지 못했어요.')
    }

    return prompt
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
