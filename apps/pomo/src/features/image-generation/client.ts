import type {TextModelId} from '../text-generation'
import type {GenerationRequest, GenerationResponse, GenerationUpdate} from './messages'
import {type ImageSettings, MAXIMUM_IDEA_LENGTH, parseSettings} from './settings'

export interface RunImageGenerationOptions {
  readonly idea: string
  readonly modelId: TextModelId
  readonly onUpdate: (update: GenerationUpdate) => void
  readonly settings: ImageSettings
  readonly signal: AbortSignal
}
export interface GeneratedImage {
  readonly blob: Blob
  readonly prompt: string
}

interface RunWorkerOptions {
  readonly onUpdate: (update: GenerationUpdate) => void
  readonly request: GenerationRequest
  readonly signal: AbortSignal
}

const runWorker = (options: RunWorkerOptions): Promise<GenerationResponse> =>
  new Promise((resolve, reject) => {
    options.signal.throwIfAborted()
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
    const cleanup = () => {
      worker.terminate()
      worker.onmessage = null
      worker.onerror = null
      options.signal.removeEventListener('abort', handleAbort)
    }
    const handleAbort = () => {
      cleanup()
      reject(new DOMException('Generation cancelled', 'AbortError'))
    }
    worker.onerror = (event) => {
      cleanup()
      reject(new Error(event.message || '모델 Worker를 실행하지 못했어요.'))
    }
    worker.onmessage = (event: MessageEvent<GenerationResponse>) => {
      const response = event.data
      switch (response.type) {
        case 'progress':
          options.onUpdate(response)
          return
        case 'error':
          cleanup()
          reject(new Error(response.message))
          return
        case 'prompt':
        case 'image':
          cleanup()
          resolve(response)
          return
      }
      response satisfies never
    }
    options.signal.addEventListener('abort', handleAbort, {once: true})
    try {
      worker.postMessage(options.request)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })

/** Generates an English prompt, releases its model, then runs Bonsai; abort terminates active work. */
export const runImageGeneration = async (
  options: RunImageGenerationOptions,
): Promise<GeneratedImage> => {
  const settings = parseSettings(options.settings)
  const idea = options.idea.trim()
  if (idea.length === 0 || idea.length > MAXIMUM_IDEA_LENGTH) {
    throw new Error('만들고 싶은 장면을 1–2,000자로 입력해 주세요.')
  }
  options.onUpdate({label: '채팅 모델로 영어 프롬프트를 준비하고 있어요…', type: 'progress'})
  const prompt = await runWorker({
    onUpdate: options.onUpdate,
    request: {idea, modelId: options.modelId, type: 'prompt'},
    signal: options.signal,
  })
  if (prompt.type !== 'prompt') {
    throw new Error('영어 프롬프트 응답을 받지 못했어요.')
  }
  options.signal.throwIfAborted()
  options.onUpdate(prompt)
  options.onUpdate({label: 'Bonsai Image 4B를 준비하고 있어요…', type: 'progress'})
  const image = await runWorker({
    onUpdate: options.onUpdate,
    request: {prompt: prompt.prompt, settings, type: 'image'},
    signal: options.signal,
  })
  if (image.type !== 'image') {
    throw new Error('이미지 응답을 받지 못했어요.')
  }
  return {blob: image.blob, prompt: prompt.prompt}
}
