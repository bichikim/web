/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js model names and options are fixed external contracts.

import {
  AutoProcessor,
  type ProgressInfo,
  Qwen3_5ForCausalLM,
  TextStreamer,
} from '@huggingface/transformers'

import {normalizeKoreanSpeechStyle, trimRepetitiveTail} from './answer'
import {createForeignTokenIds} from './foreign-tokens'
import {createDirectAnswerMessages} from './prompt'
import {createQwenProgress} from './progress'
import type {QwenWorkerRequest, QwenWorkerResponse} from './messages'
import {getQwenModel, type QwenModelId} from './model'

const MAXIMUM_NEW_TOKENS = 1024
const workerScope = self as DedicatedWorkerGlobalScope

let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null
let model: Awaited<ReturnType<typeof Qwen3_5ForCausalLM.from_pretrained>> | null = null
let preparePromise: Promise<void> | null = null
let suppressedTokenIds: Array<number> | null = null
let activeModelId: QwenModelId | null = null

const sendResponse = (response: QwenWorkerResponse) => workerScope.postMessage(response)

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return 'Qwen 모델을 실행하지 못했어요.'
}

const reportProgress = (progress: ProgressInfo) => {
  if (progress.status !== 'progress_total') {
    return
  }

  sendResponse({
    ...createQwenProgress({
      files: progress.files,
      loadedBytes: progress.loaded,
      totalBytes: progress.total,
    }),
    type: 'loading',
  })
}

const loadModel = async (modelId: QwenModelId) => {
  if (activeModelId !== null && activeModelId !== modelId) {
    throw new Error('다른 Qwen 모델을 사용하려면 실행 세션을 다시 시작해야 해요.')
  }

  if (processor !== null && model !== null) {
    return
  }

  if (preparePromise === null) {
    activeModelId = modelId
    const modelDefinition = getQwenModel(modelId)
    preparePromise = (async () => {
      const [nextProcessor, nextModel] = await Promise.all([
        AutoProcessor.from_pretrained(modelDefinition.repositoryId),
        // AI_NOTE - 이 페이지는 텍스트만 생성하므로 CausalLM 경로로 비전 인코더 다운로드와 GPU 세션을 제외해요.
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

const prepareModel = async (modelId: QwenModelId) => {
  await loadModel(modelId)
  sendResponse({type: 'ready'})
}

const generateDirectAnswer = async (modelId: QwenModelId, request: string) => {
  await loadModel(modelId)

  if (processor === null || model === null) {
    throw new Error('Qwen 모델이 준비되지 않았어요.')
  }

  const {tokenizer} = processor

  if (tokenizer === undefined) {
    throw new Error('Qwen 토크나이저가 준비되지 않았어요.')
  }

  sendResponse({type: 'started'})
  let output = ''
  const messages = createDirectAnswerMessages({request})
  // AI_NOTE - Transformers.js는 템플릿 확장 옵션을 런타임에서 받지만 현재 타입에는 명시하지 않으므로 변수로 전달해요.
  const chatTemplateOptions = {
    add_generation_prompt: true,
    enable_thinking: false,
  }
  const prompt = processor.apply_chat_template(messages, chatTemplateOptions)
  const inputs = await processor(prompt)
  suppressedTokenIds ??= createForeignTokenIds(tokenizer)

  await model.generate({
    ...inputs,
    do_sample: true,
    max_new_tokens: MAXIMUM_NEW_TOKENS,
    no_repeat_ngram_size: 4,
    repetition_penalty: 1.15,
    streamer: new TextStreamer(tokenizer, {
      callback_function: (text) => {
        output += text
        sendResponse({text, type: 'token'})
      },
      skip_prompt: true,
      skip_special_tokens: true,
    }),
    suppress_tokens: suppressedTokenIds,
    temperature: 0.7,
    top_k: 40,
    top_p: 0.9,
  })

  sendResponse({text: normalizeKoreanSpeechStyle(trimRepetitiveTail(output)), type: 'complete'})
}

workerScope.addEventListener('message', (event: MessageEvent<QwenWorkerRequest>) => {
  const operation =
    event.data.type === 'prepare'
      ? prepareModel(event.data.modelId)
      : generateDirectAnswer(event.data.modelId, event.data.request)

  operation.catch((error: unknown) => {
    sendResponse({message: getErrorMessage(error), restartRequired: false, type: 'error'})
  })
})
