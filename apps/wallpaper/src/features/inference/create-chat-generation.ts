// oxlint-disable eslint-js/camelcase -- Transformers.js options use upstream names.
import {env, Gemma4ForCausalLM, Gemma4Processor, TextStreamer} from '@huggingface/transformers'
import {createModelProgress} from './create-model-progress'
import type {ChatGeneration, ChatInput} from './types'
import manifest from '../../../conversation-model.json'

const loadChat = async (modelPath: string, onStatus?: (text: string) => void) => {
  const gpu =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    (await navigator.gpu.requestAdapter()) !== null
  if (!gpu) {
    throw new Error('Gemma 4를 실행하려면 WebGPU를 사용할 수 있어야 해요.')
  }
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.useBrowserCache = false
  env.useFSCache = false
  const prefix = '/conversation-models/'
  env.localModelPath = prefix
  const fetchAsset = globalThis.fetch
  env.fetch = (input, init) => {
    const path = typeof input === 'string' ? input : input.href
    if (!path.startsWith(prefix)) {
      throw new Error('Conversation assets must use the shared cache')
    }
    return fetchAsset(`${modelPath}${path.slice(prefix.length)}`, {...init, cache: 'no-store'})
  }
  onStatus?.('Gemma 4 E2B 준비 중')
  const processor = await Gemma4Processor.from_pretrained(manifest.model, {
    local_files_only: true,
    revision: manifest.revision,
  })
  const {tokenizer} = processor
  if (tokenizer === undefined) {
    throw new Error('Gemma 4 토크나이저를 준비하지 못했어요.')
  }
  const model = await Gemma4ForCausalLM.from_pretrained(manifest.model, {
    device: 'webgpu',
    dtype: {decoder_model_merged: 'q4', embed_tokens: 'q4'},
    local_files_only: true,
    progress_callback: createModelProgress((text) => onStatus?.(text)),
    revision: manifest.revision,
  })
  return {model, processor, tokenizer}
}

/** Generates local character replies with Pomofi's pinned Gemma model; the worker owns model lifetime. */
export const createChatGeneration = (modelPath: string): ChatGeneration => {
  let pending: ReturnType<typeof loadChat> | null = null
  const prepare = async (onStatus?: (text: string) => void) => {
    pending ??= loadChat(modelPath, onStatus)
    try {
      return await pending
    } catch (cause) {
      pending = null
      throw cause
    }
  }
  const generate = async (input: ChatInput, onStatus?: (text: string) => void): Promise<string> => {
    const {model, processor, tokenizer} = await prepare(onStatus)
    const instruction =
      '너는 바탕화면에서 사용자와 함께 지내는 다정한 캐릭터야. ' +
      '사용자가 쓴 언어로 자연스럽게 1~3문장으로 대화해. ' +
      '별도 요청이 없으면 한국어로 답해. 도구를 실행하거나 Codex 작업을 수행한다고 말하지 마.'
    const template = {add_generation_prompt: true, enable_thinking: false, tokenize: false as const}
    const prompt = processor.apply_chat_template(
      [{content: instruction, role: 'system'}, ...input.messages],
      template,
    )
    if (typeof prompt !== 'string') {
      throw new Error('캐릭터 대화를 준비하지 못했어요.')
    }
    const inputs = await processor(prompt)
    onStatus?.('답변 생성 중')
    let answer = ''
    await model.generate({
      ...inputs,
      do_sample: true,
      max_new_tokens: 192,
      repetition_penalty: 1.1,
      streamer: new TextStreamer(tokenizer, {
        callback_function: (text) => {
          answer += text
        },
        skip_prompt: true,
        skip_special_tokens: true,
      }),
      temperature: 0.7,
      top_p: 0.9,
    })
    if (!answer.trim()) {
      throw new Error('캐릭터가 답변을 만들지 못했어요. 다시 보내 주세요.')
    }
    return answer.trim()
  }
  return {generate}
}
