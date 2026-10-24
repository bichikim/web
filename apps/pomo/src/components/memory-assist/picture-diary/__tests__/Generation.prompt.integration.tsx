/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import * as m from '@paraglide/message'
import {Flux2KleinPipeline} from '@winter-love/bonsai'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import {isTextModelDownloaded} from 'src/features/text-generation'
import {createTransformersRuntime} from 'src/features/text-generation/transformers-runtime'
import type {GenerationRequest, GenerationResponse} from 'src/features/image-generation/messages'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {Generation} from '../Generation'

vi.mock('src/features/text-generation/transformers-runtime', () => ({
  createTransformersRuntime: vi.fn(),
}))
vi.mock('@winter-love/bonsai', () => ({Flux2KleinPipeline: {from_pretrained: vi.fn()}}))
vi.mock('src/features/text-generation', async () => {
  const actual = await vi.importActual<typeof import('src/features/text-generation')>(
    'src/features/text-generation',
  )
  return {...actual, isTextModelDownloaded: vi.fn()}
})

const scope = {
  onmessage: null as null | ((event: {data: GenerationRequest}) => Promise<void>),
  postMessage: vi.fn<(message: GenerationResponse) => void>(),
}
let replyToWorker: ((message: GenerationResponse) => void) | null = null

// 실제 Worker 핸들러와 UI 사이의 메시지만 연결하며 모델/GPU 경계는 제어한다.
class LinkedWorker {
  onmessage: ((event: MessageEvent<GenerationResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  receive = (message: GenerationResponse) => {
    queueMicrotask(() => this.onmessage?.(new MessageEvent('message', {data: message})))
  }
  postMessage(request: GenerationRequest) {
    replyToWorker = this.receive
    void scope.onmessage?.({data: structuredClone(request)})
  }
  terminate() {
    if (replyToWorker === this.receive) {
      replyToWorker = null
    }
  }
}

const createRuntime = (): ModelDownloadRuntime => ({
  createImageClient: ({callbacks}) => ({
    dispose: vi.fn(),
    prepare: () => queueMicrotask(callbacks.onReady),
  }),
  createTextClient: () => {
    throw new Error('The prepared text model must not be downloaded in this fixture')
  },
  createVoiceClient: () => {
    throw new Error('Voice download is outside image generation')
  },
})
const generateText = vi.fn()
const generateImage = vi.fn()

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  replyToWorker = null
  scope.onmessage = null
  scope.postMessage.mockImplementation((message) => {
    replyToWorker?.(message)
  })
  vi.mocked(createTransformersRuntime).mockReturnValue({
    countTokens: vi.fn(),
    generate: generateText,
    getTokenizer: vi.fn(),
    prepare: vi.fn().mockResolvedValue(undefined),
  })
  vi.mocked(Flux2KleinPipeline.from_pretrained).mockResolvedValue({
    destroy: vi.fn(),
    generate: generateImage,
  } as unknown as Flux2KleinPipeline)
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
  const originalSelf = globalThis.self
  vi.stubGlobal('self', scope)
  await import('src/features/image-generation/worker')
  vi.stubGlobal('self', originalSelf)
  vi.stubGlobal('Worker', LinkedWorker)
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated-image')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should show a model prompt failure and allow retrying the same detailed scene', async () => {
  const idea = '봄날 벚꽃길에서 골든 리트리버가 공을 물고 달리는 수채화'
  const englishPrompt = 'A watercolor painting of a golden retriever running under spring blossoms'
  generateText.mockResolvedValueOnce(idea).mockResolvedValueOnce(englishPrompt)
  generateImage.mockResolvedValue({toBlob: () => new Blob(['png'], {type: 'image/png'})})
  render(() => (
    <PModelDownloadProvider runtime={createRuntime()}>
      <Generation initialIdea={idea} />
    </PModelDownloadProvider>
  ))
  const generate = screen.getByRole('button', {name: m.picture_diary_generate()})
  const scene = screen.getByRole('textbox', {name: m.picture_diary_scene()})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)

  expect(await screen.findByRole('alert')).toHaveTextContent('영어 프롬프트를 만들지 못했어요')
  expect(screen.getByRole('alert')).not.toHaveTextContent('구체적으로')
  expect(scene).toHaveValue(idea)
  expect(generateImage).not.toHaveBeenCalled()
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)

  await screen.findByRole('img', {name: new RegExp(englishPrompt, 'u')})
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(scene).toHaveValue(idea)
  expect(generateText.mock.calls.map(([request]) => request.messages[1].content)).toEqual([
    idea,
    idea,
  ])
  expect(generateImage).toHaveBeenCalledOnce()
})
