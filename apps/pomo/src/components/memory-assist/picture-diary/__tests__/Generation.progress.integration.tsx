/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import * as m from '@paraglide/message'
import {useImageGeneration} from 'src/features/image-generation'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import {isTextModelDownloaded} from 'src/features/text-generation'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {Generation} from '../Generation'

vi.mock('src/features/image-generation', async () => {
  const actual: typeof import('src/features/image-generation') = await vi.importActual(
    'src/features/image-generation',
  )

  return {...actual, useImageGeneration: vi.fn(actual.useImageGeneration)}
})

vi.mock('src/features/text-generation', async () => {
  const actual: typeof import('src/features/text-generation') = await vi.importActual(
    'src/features/text-generation',
  )

  return {...actual, isTextModelDownloaded: vi.fn()}
})

interface MockWorkerMessage {
  readonly blob?: Blob
  readonly label?: string
  readonly percentage?: number
  readonly prompt?: string
  readonly type: 'image' | 'progress' | 'prompt'
}

interface MockWorkerRequest {
  readonly type: 'image' | 'prompt'
}

let finishImageDownload: (() => void) | undefined
let sendImageMessage: ((message: MockWorkerMessage) => void) | undefined

class ControlledWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent<MockWorkerMessage>) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  terminate = vi.fn()

  emit(message: MockWorkerMessage) {
    this.onmessage?.(new MessageEvent('message', {data: message}))
  }

  postMessage = (request: MockWorkerRequest) => {
    switch (request.type) {
      case 'prompt':
        queueMicrotask(() => this.emit({prompt: 'A walk in the park', type: 'prompt'}))
        return
      case 'image':
        sendImageMessage = (message) => this.emit(message)
        queueMicrotask(() =>
          this.emit({label: 'Image generation · 4/3', percentage: 133, type: 'progress'}),
        )
        return
    }
    request.type satisfies never
  }
}

const createRuntime = (): ModelDownloadRuntime => ({
  createImageClient: ({callbacks}) => ({
    dispose: vi.fn(),
    prepare: () => {
      callbacks.onProgress(133)
      finishImageDownload = callbacks.onReady
    },
  }),
  createTextClient: () => ({dispose: vi.fn(), prepare: vi.fn()}),
  createVoiceClient: () => {
    throw new Error('Voice model download is not part of picture diary generation.')
  },
})

beforeEach(() => {
  finishImageDownload = undefined
  sendImageMessage = undefined
  vi.mocked(useImageGeneration).mockClear()
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
  vi.stubGlobal('Worker', ControlledWorker)
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should keep raw controller progress while bounding generation and download presentation', async () => {
  render(() => (
    <PModelDownloadProvider runtime={createRuntime()}>
      <Generation initialIdea="산책" />
    </PModelDownloadProvider>
  ))

  const studio = vi.mocked(useImageGeneration).mock.results.at(-1)?.value
  const status = screen.getByRole('status')
  const generate = screen.getByRole('button', {name: '이미지 생성'})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)

  await waitFor(() => expect(studio?.status()).toContain('Bonsai'))
  expect(studio?.percentage()).toBe(133)
  expect(status).toHaveTextContent('100%')
  expect(within(status).getByRole('progressbar')).toHaveAttribute('value', '100')

  finishImageDownload?.()
  await waitFor(() => expect(sendImageMessage).toBeDefined())
  await waitFor(() => expect(studio?.status()).not.toContain('Bonsai'))
  expect(studio?.percentage()).toBe(133)
  expect(status).toHaveTextContent('100%')
  expect(within(status).getByRole('progressbar')).toHaveAttribute('value', '100')

  sendImageMessage?.({label: 'Image generation · negative', percentage: -17, type: 'progress'})
  expect(studio?.percentage()).toBe(-17)
  expect(status).toHaveTextContent('0%')
  expect(within(status).getByRole('progressbar')).toHaveAttribute('value', '0')

  sendImageMessage?.({label: 'Image generation · NaN', percentage: Number.NaN, type: 'progress'})
  expect(studio?.percentage()).toBeNaN()
  expect(within(status).queryByText(/%$/u)).not.toBeInTheDocument()
  expect(within(status).getByRole('progressbar')).not.toHaveAttribute('value')

  sendImageMessage?.({
    label: 'Image generation · infinity',
    percentage: Number.POSITIVE_INFINITY,
    type: 'progress',
  })
  expect(studio?.percentage()).toBe(Number.POSITIVE_INFINITY)
  expect(within(status).queryByText(/%$/u)).not.toBeInTheDocument()
  expect(within(status).getByRole('progressbar')).not.toHaveAttribute('value')

  sendImageMessage?.({label: 'Image generation · unknown', type: 'progress'})
  expect(studio?.percentage()).toBeUndefined()
  expect(within(status).queryByText(/%$/u)).not.toBeInTheDocument()
  expect(within(status).getByRole('progressbar')).not.toHaveAttribute('value')

  sendImageMessage?.({blob: new Blob(['png'], {type: 'image/png'}), type: 'image'})
  await screen.findByRole('button', {name: '이 그림 위에 그림 그리기'})
  expect(studio?.busy()).toBe(false)
  expect(studio?.error()).toBeNull()
  expect(studio?.percentage()).toBeUndefined()
  expect(studio?.status()).toBe(m.picture_diary_generation_complete())
})
