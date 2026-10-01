import {createOneShotWorkerRequest} from 'src/utils/worker-transport'
import * as m from '@paraglide/message'
import type {ModelDownloadController} from '../model-download'
import {prepareImageModels} from './prepare'
import {ART_STYLES, type ArtStyle} from './styles'
import type {TextModelId} from '../text-generation'
import type {GenerationRequest, GenerationResponse, GenerationUpdate} from './messages'
import {type ImageSettings, MAXIMUM_IDEA_LENGTH, parseSettings} from './settings'

export interface RunImageGenerationOptions {
  readonly downloads: ModelDownloadController
  readonly style?: ArtStyle
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
  createOneShotWorkerRequest<GenerationRequest, GenerationResponse, GenerationResponse>({
    abortError: () => new DOMException('Generation cancelled', 'AbortError'),
    failureMessage: m.picture_diary_generation_error(),
    onMessage: (response, reply) => {
      switch (response.type) {
        case 'progress':
          options.onUpdate(response)
          return
        case 'error':
          reply.reject(new Error(response.message))
          return
        case 'ready':
        case 'prompt':
        case 'image':
          reply.resolve(response)
          return
      }
      response satisfies never
    },
    request: options.request,
    signal: options.signal,
    worker: () => new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'}),
  })

/** Generates an English prompt, releases its model, then runs Bonsai; abort terminates active work. */
export const runImageGeneration = async (
  options: RunImageGenerationOptions,
): Promise<GeneratedImage> => {
  const settings = parseSettings(options.settings)
  const idea = options.idea.trim()
  if (idea.length === 0 || idea.length > MAXIMUM_IDEA_LENGTH) {
    throw new Error(m.picture_diary_generation_invalid_idea())
  }
  options.onUpdate({label: m.picture_diary_generation_prepare_download(), type: 'progress'})
  await prepareImageModels({
    downloads: options.downloads,
    modelId: options.modelId,
    signal: options.signal,
    variant: settings.variant,
  })
  options.onUpdate({label: m.picture_diary_generation_prepare_prompt(), type: 'progress'})
  const prompt = await runWorker({
    onUpdate: options.onUpdate,
    request: {idea, modelId: options.modelId, type: 'prompt'},
    signal: options.signal,
  })
  if (prompt.type !== 'prompt') {
    throw new Error(m.picture_diary_generation_missing_prompt())
  }
  options.signal.throwIfAborted()
  const context = ART_STYLES[options.style ?? 'none']
  const styledPrompt = context === '' ? prompt.prompt : `${prompt.prompt}\nArt style: ${context}`
  options.onUpdate({prompt: styledPrompt, type: 'prompt'})
  options.onUpdate({label: m.picture_diary_generation_prepare_image_model(), type: 'progress'})
  const image = await runWorker({
    onUpdate: options.onUpdate,
    request: {prompt: styledPrompt, settings, type: 'image'},
    signal: options.signal,
  })
  if (image.type !== 'image') {
    throw new Error(m.picture_diary_generation_missing_image())
  }
  return {blob: image.blob, prompt: styledPrompt}
}
