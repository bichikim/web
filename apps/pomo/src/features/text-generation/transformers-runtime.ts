/// <reference lib="webworker" />
import {resolveTextModelAssetUrl} from './resolve-text-model-asset-url'
import {createTransformersLoadOptions} from './create-transformers-load-options'

// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {
  AutoProcessor,
  AutoTokenizer,
  env,
  Gemma4ForCausalLM,
  Gemma4Processor,
  Lfm2ForCausalLM,
  type ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'
import * as transformers from '@huggingface/transformers'

import {getTextModelImplementation, type TextModelId, type TextModelImplementation} from './model'
import {createTextGenerationProgress} from './progress'
import {getTextRuntimeAssetUrl} from './runtime-assets'
import type {GgufModelDependencies} from './load-gguf-model'
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
  type ModelStorage,
  reportModelStorageError,
} from '../model-storage'
import {httpFetch} from '../http-client'
import {createPomoAssetFetcher, isPomoSteamRuntime} from '../product-assets'

const CHAT_TEMPLATE_OPTIONS = {
  add_generation_prompt: true,
  enable_thinking: false,
  tokenize: false,
}
const GEMMA_TOKENIZER_CACHE_MIGRATION_VERSION = 1

type TextGenerationModel =
  | Awaited<ReturnType<typeof Gemma4ForCausalLM.from_pretrained>>
  | Awaited<ReturnType<typeof Lfm2ForCausalLM.from_pretrained>>
  | QwenTextGenerationModel
  | import('@wllama/wllama/esm/index.js').Wllama

type TextInputProcessor =
  | Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>
  | Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>

const createGenerationCancellation = (signal?: AbortSignal) => {
  const stoppingCriteria =
    signal === undefined ? undefined : new transformers.InterruptableStoppingCriteria()
  const interruptGeneration = () => stoppingCriteria?.interrupt()
  signal?.addEventListener('abort', interruptGeneration, {once: true})
  if (signal?.aborted) {
    stoppingCriteria?.interrupt()
  }

  return {
    cleanup: () => signal?.removeEventListener('abort', interruptGeneration),
    stoppingCriteria,
  }
}

const loadModel = (
  modelDefinition: TextModelImplementation,
  reportProgress: (progress: ProgressInfo) => void,
  dependencies: GgufModelDependencies,
): Promise<TextGenerationModel> => {
  if (modelDefinition.architecture === 'lfm-2-gguf') {
    return import('./load-gguf-model').then(({loadGgufModel}) =>
      loadGgufModel({...dependencies, model: modelDefinition, onProgress: reportProgress}),
    )
  }

  const loadOptions = createTransformersLoadOptions({
    model: modelDefinition,
    onProgress: reportProgress,
  })

  switch (modelDefinition.architecture) {
    case 'lfm-2':
      return Lfm2ForCausalLM.from_pretrained(modelDefinition.repositoryId, loadOptions)
    case 'gemma-4':
      return Gemma4ForCausalLM.from_pretrained(modelDefinition.repositoryId, loadOptions)
    case 'qwen-3.5': {
      if (!import.meta.env.DEV) {
        throw new Error('Qwen 텍스트 모델은 개발 빌드에서만 사용할 수 있어요.')
      }

      return import('./qwen-model').then(({loadQwenModel}) =>
        loadQwenModel({model: modelDefinition, onProgress: reportProgress}),
      )
    }
  }
}

const loadProcessor = async (
  modelDefinition: TextModelImplementation,
): Promise<TextInputProcessor> => {
  if (modelDefinition.architecture === 'lfm-2-gguf') {
    const tokenizer = await AutoTokenizer.from_pretrained(modelDefinition.repositoryId, {
      revision: modelDefinition.assetSource.revision,
    })
    const url = resolveTextModelAssetUrl({
      ...modelDefinition,
      relativePath: `${modelDefinition.tokenizerSubfolder}/chat_template.jinja`,
    })
    const cached = await env.customCache?.match(url)
    const response = cached ?? (await (env.fetch ?? httpFetch)(url))
    if (!response.ok) {
      throw new Error(`QAD 채팅 템플릿을 내려받지 못했어요: HTTP ${response.status}`)
    }
    if (cached === undefined) {
      await env.customCache?.put(url, response.clone())
    }
    // Transformers.js cannot parse assistant-token mask blocks used by the official QAD template.
    tokenizer.chat_template = (await response.text()).replaceAll(
      /\{%-?\s*(?:end)?generation\s*-?%\}/gu,
      '',
    )
    return tokenizer
  }
  const processorLoader = (() => {
    switch (modelDefinition.architecture) {
      case 'gemma-4':
        return Gemma4Processor
      case 'lfm-2':
        return AutoTokenizer
      case 'qwen-3.5':
        return AutoProcessor
    }
  })()

  return processorLoader.from_pretrained(modelDefinition.repositoryId, {
    revision: modelDefinition.assetSource.revision,
  })
}

const createPrompt = (
  activeProcessor: TextInputProcessor,
  messages: Array<TextGenerationMessage>,
) => {
  const prompt = activeProcessor.apply_chat_template(messages, CHAT_TEMPLATE_OPTIONS)

  if (typeof prompt !== 'string') {
    throw new Error('텍스트 모델 프롬프트를 문자열로 만들지 못했어요.')
  }

  return prompt
}

interface ModelAssetDependencies extends GgufModelDependencies {
  readonly storage: ModelStorage
}

const createModelAssetDependencies = (): ModelAssetDependencies => {
  const modelAssetFetcher = isPomoSteamRuntime() ? globalThis.fetch : httpFetch
  const resumableModelFetch = createResumableModelFetch({
    fetcher: createPomoAssetFetcher(modelAssetFetcher),
  })
  return {
    fetcher: resumableModelFetch.fetch,
    onStorageError: reportModelStorageError,
    onStored: resumableModelFetch.deletePartial,
    storage: createModelStorage(),
  }
}

export const createTransformersRuntime = (
  options: CreateTextGenerationRuntimeOptions,
): TextGenerationRuntime => {
  const dependencies = createModelAssetDependencies()
  const versionedCacheKeys = new Map<string, string>()
  env.fetch = dependencies.fetcher
  env.useBrowserCache = false
  env.useCustomCache = true
  env.customCache = createTransformersModelCache({
    getStorageKey: (request) => versionedCacheKeys.get(request) ?? request,
    onError: reportModelStorageError,
    onStored: dependencies.onStored,
    storage: dependencies.storage,
  })

  let processor: TextInputProcessor | null = null
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
      const wasm = env.backends?.onnx?.wasm
      const paths = wasm?.wasmPaths
      if (wasm !== undefined && typeof paths === 'object' && paths !== null) {
        wasm.wasmPaths = {
          mjs: getTextRuntimeAssetUrl(paths.mjs),
          wasm: getTextRuntimeAssetUrl(paths.wasm),
        }
      }
      env.allowLocalModels = false
      env.allowRemoteModels = true
      env.remoteHost = assetSource.host
      const tokenizerPath = assetSource.pathTemplate.replaceAll('{revision}', assetSource.revision)
      // Tokenizer discovery requests the default revision before forwarding loader options.
      env.remotePathTemplate =
        modelDefinition.architecture === 'lfm-2-gguf'
          ? `${tokenizerPath}${modelDefinition.tokenizerSubfolder}/`
          : assetSource.pathTemplate
      preparePromise = (async () => {
        if (modelId === 'gemma-4-e2b') {
          const tokenizerUrl = resolveTextModelAssetUrl({
            ...modelDefinition,
            relativePath: 'tokenizer.json',
          })
          versionedCacheKeys.set(
            tokenizerUrl,
            `${tokenizerUrl}?pomo-cache-version=${GEMMA_TOKENIZER_CACHE_MIGRATION_VERSION}`,
          )
        }
        const processorPromise = loadProcessor(modelDefinition)
        const startModel = () => loadModel(modelDefinition, reportProgress, dependencies)
        const modelPromise =
          modelDefinition.architecture === 'lfm-2-gguf'
            ? processorPromise.then(startModel)
            : startModel()
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
    const tokenizer =
      processor === null ? undefined : 'tokenizer' in processor ? processor.tokenizer : processor

    if (tokenizer === undefined) {
      throw new Error('텍스트 모델 토크나이저가 준비되지 않았어요.')
    }

    return tokenizer
  }

  const getTokenizer = (): TextTokenVocabulary => getProcessorTokenizer()

  const countTokens = async (messages: Array<TextGenerationMessage>) => {
    if (processor === null) {
      throw new Error('텍스트 모델 프로세서가 준비되지 않았어요.')
    }

    const inputs = await processor(createPrompt(processor, messages))
    return inputs.input_ids.dims.at(-1) ?? 0
  }

  const generate = async (generationOptions: GenerateTextOptions) => {
    if (processor === null || model === null) {
      throw new Error('텍스트 모델이 준비되지 않았어요.')
    }

    if ('createChatCompletion' in model) {
      const {generateGgufText} = await import('./generate-gguf-text')
      return generateGgufText({model, options: generationOptions})
    }

    const {cleanup, stoppingCriteria} = createGenerationCancellation(generationOptions.signal)

    try {
      const tokenizer = getProcessorTokenizer()
      const inputs = await processor(createPrompt(processor, generationOptions.messages))
      let output = ''

      await model.generate({
        ...inputs,
        do_sample: true,
        max_new_tokens: generationOptions.maximumTokens,
        no_repeat_ngram_size: generationOptions.noRepeatNgramSize,
        repetition_penalty: generationOptions.repetitionPenalty,
        ...(stoppingCriteria === undefined ? {} : {stopping_criteria: stoppingCriteria}),
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
    } finally {
      cleanup()
    }
  }

  return {countTokens, generate, getTokenizer, prepare}
}
