/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {
  AutoTokenizer,
  env,
  Gemma4ForCausalLM,
  type ProgressInfo,
  Qwen3_5ForCausalLM,
  TextStreamer,
} from '@huggingface/transformers'

import {getTextModelImplementation, type TextModelId, type TextModelImplementation} from './model'
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
  tokenize: false,
}

type TextGenerationModel =
  | Awaited<ReturnType<typeof Gemma4ForCausalLM.from_pretrained>>
  | Awaited<ReturnType<typeof Qwen3_5ForCausalLM.from_pretrained>>

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
  } as const

  switch (modelDefinition.architecture) {
    case 'gemma-4':
      return Gemma4ForCausalLM.from_pretrained(modelDefinition.repositoryId, loadOptions)
    case 'qwen-3.5':
      return Qwen3_5ForCausalLM.from_pretrained(modelDefinition.repositoryId, loadOptions)
  }

  modelDefinition.architecture satisfies never
}

const loadTokenizer = async (modelDefinition: TextModelImplementation) => {
  const tokenizer = await AutoTokenizer.from_pretrained(modelDefinition.repositoryId)

  if (modelDefinition.chatTemplateFile !== undefined) {
    const templateUrl = `https://huggingface.co/${modelDefinition.repositoryId}/resolve/main/${modelDefinition.chatTemplateFile}`
    const response = await fetch(templateUrl)

    if (!response.ok) {
      throw new Error(`텍스트 모델 채팅 템플릿을 불러오지 못했어요. (${response.status})`)
    }

    tokenizer.chat_template = await response.text()
  }

  return tokenizer
}

export const createTransformersRuntime = (
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

  let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null
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

    if (tokenizer !== null && model !== null) {
      return
    }

    if (preparePromise === null) {
      activeModelId = modelId
      const modelDefinition = getTextModelImplementation(modelId)
      preparePromise = (async () => {
        const [nextTokenizer, nextModel] = await Promise.all([
          loadTokenizer(modelDefinition),
          loadModel(modelDefinition, reportProgress),
        ])

        tokenizer = nextTokenizer
        model = nextModel
      })()
    }

    try {
      await preparePromise
    } catch (error) {
      tokenizer = null
      model = null
      preparePromise = null
      activeModelId = null
      throw error
    }
  }

  const getTokenizer = (): TextTokenVocabulary => {
    if (tokenizer === null) {
      throw new Error('텍스트 모델 토크나이저가 준비되지 않았어요.')
    }

    return tokenizer
  }

  const createPrompt = (messages: Array<TextGenerationMessage>) => {
    if (tokenizer === null) {
      throw new Error('텍스트 모델 토크나이저가 준비되지 않았어요.')
    }

    const prompt = tokenizer.apply_chat_template(messages, CHAT_TEMPLATE_OPTIONS)

    if (typeof prompt !== 'string') {
      throw new Error('텍스트 모델 프롬프트를 문자열로 만들지 못했어요.')
    }

    return prompt
  }

  const countTokens = async (messages: Array<TextGenerationMessage>) => {
    if (tokenizer === null) {
      throw new Error('텍스트 모델 토크나이저가 준비되지 않았어요.')
    }

    const inputs = await tokenizer(createPrompt(messages))
    return inputs.input_ids.dims.at(-1) ?? 0
  }

  const generate = async (generationOptions: GenerateTextOptions) => {
    if (tokenizer === null || model === null) {
      throw new Error('텍스트 모델이 준비되지 않았어요.')
    }

    const inputs = await tokenizer(createPrompt(generationOptions.messages))
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
