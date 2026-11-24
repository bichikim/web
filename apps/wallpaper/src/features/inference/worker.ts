import {env} from '@huggingface/transformers'
import {createChatGeneration} from './create-chat-generation'
import type {ChatGeneration, InferenceReply, InferenceRequest} from './types'

let chat: ChatGeneration | null = null
const post = (id: number, type: InferenceReply['type'], text: string) =>
  globalThis.postMessage({id, text, type} satisfies InferenceReply)

globalThis.onmessage = async (event: MessageEvent<InferenceRequest>) => {
  const {id, input, runtimePath, modelPath} = event.data
  try {
    const {wasm} = env.backends.onnx
    if (wasm !== undefined) {
      wasm.wasmPaths = runtimePath
      wasm.numThreads = 1
      wasm.proxy = false
    }
    chat ??= createChatGeneration(modelPath)
    post(id, 'text', await chat.generate(input, (text) => post(id, 'status', text)))
  } catch (cause) {
    console.error('Local inference failed', cause)
    post(id, 'error', cause instanceof Error ? cause.message : '로컬 모델 실행에 실패했어요.')
  }
}
