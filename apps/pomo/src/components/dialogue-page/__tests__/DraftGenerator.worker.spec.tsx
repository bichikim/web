/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {
  type ModelDownloadController,
  type ModelDownloadRuntime,
  PModelDownloadProvider,
  useModelDownload,
} from '../../../features/model-download'
import {createDialogueClient, type DialogueClient} from '../../../features/dialogue-writer/client'
import type {DialogueWorkerResponse} from '../../../features/dialogue-writer/messages'
import {isTextModelDownloaded} from '../../../features/text-generation'
import {supportsWebGpu} from '../../../features/text-generation/environment'
import type {TextModelDownloadResponse} from '../../../features/model-download/text-client'
import {PDialogueDraftGenerator} from '../DraftGenerator'

const workerMocks = vi.hoisted(() => ({
  createDialogueClient: vi.fn(),
  supportsWebGpu: vi.fn(),
}))

vi.mock('../../../features/dialogue-writer/client', () => ({
  createDialogueClient: workerMocks.createDialogueClient,
}))

vi.mock('../../../features/text-generation/environment', () => ({
  supportsWebGpu: workerMocks.supportsWebGpu,
}))

vi.mock('../../../features/text-generation', async () => {
  const actual: typeof import('../../../features/text-generation') = await vi.importActual(
    '../../../features/text-generation',
  )

  return {...actual, isTextModelDownloaded: vi.fn()}
})

interface ModelDownloadObserverProps {
  readonly onController: (controller: ModelDownloadController) => void
}

const ModelDownloadObserver = (props: ModelDownloadObserverProps) => {
  props.onController(useModelDownload())
  return null
}

const createControlledModelDownloadRuntime = () => {
  let respond: ((response: TextModelDownloadResponse) => void) | null = null
  const runtime: ModelDownloadRuntime = {
    createTextClient: ({onResponse}) => {
      respond = onResponse
      return {dispose: vi.fn(), prepare: vi.fn()}
    },
    createVoiceClient: () => {
      throw new Error('The dialogue draft path does not download a voice model.')
    },
  }

  return {
    emit: (response: TextModelDownloadResponse) => {
      if (respond === null) {
        throw new Error('The text model download client was not created.')
      }

      respond(response)
    },
    runtime,
  }
}

const createControlledDialogueWorker = () => {
  let respond: ((response: DialogueWorkerResponse) => void) | null = null
  const client: DialogueClient = {
    dispose: vi.fn(),
    generate: vi.fn(),
    prepare: vi.fn(),
  }
  vi.mocked(createDialogueClient).mockImplementation((options) => {
    respond = options.onResponse
    return client
  })

  return {
    client,
    emit: (response: DialogueWorkerResponse) => {
      if (respond === null) {
        throw new Error('The dialogue writer client was not created.')
      }

      respond(response)
    },
  }
}

const renderDraftGenerator = (
  runtime: ModelDownloadRuntime,
  onController: (controller: ModelDownloadController) => void,
) => {
  render(
    () => (
      <PModelDownloadProvider runtime={runtime}>
        <ModelDownloadObserver onController={onController} />
        <PDialogueDraftGenerator onGenerated={vi.fn()} />
      </PModelDownloadProvider>
    ),
    {wrapper: PreferenceProvider},
  )
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supportsWebGpu).mockReturnValue(true)
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
})

it('should cap background Gemma progress while preserving raw telemetry', () => {
  const modelWorker = createControlledModelDownloadRuntime()
  const controllerRef: {current: ModelDownloadController | null} = {current: null}
  renderDraftGenerator(modelWorker.runtime, (value) => {
    controllerRef.current = value
  })

  const controller = controllerRef.current
  if (controller === null) {
    throw new Error('The model download provider was not mounted.')
  }

  void controller.startTextModel('gemma-4-e2b')
  const backgroundProgress = {
    files: [],
    loadedBytes: 120,
    percentage: 120,
    totalBytes: 100,
    type: 'loading',
  } satisfies TextModelDownloadResponse
  modelWorker.emit(backgroundProgress)

  expect(controller.state()).toMatchObject({percentage: 120, status: 'loading'})
  expect(screen.getByRole('status').textContent).toContain('100%')
  expect(screen.getByRole('status').textContent).not.toContain('120%')
  expect(
    screen.getByRole('progressbar', {name: '대사 생성 진행률'}).getAttribute('aria-valuenow'),
  ).toBe('100')
})

it('should cap inline writer progress and preserve its ready and error lifecycle', async () => {
  const dialogueWorker = createControlledDialogueWorker()
  const modelWorker = createControlledModelDownloadRuntime()
  renderDraftGenerator(modelWorker.runtime, () => undefined)

  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await Promise.resolve()
  expect(dialogueWorker.client.prepare).toHaveBeenCalledOnce()

  const writerProgress = {
    files: [],
    loadedBytes: 150,
    percentage: 150,
    totalBytes: 100,
    type: 'loading',
  } satisfies DialogueWorkerResponse
  dialogueWorker.emit(writerProgress)

  const status = screen.getByRole('status')
  const progressbar = screen.getByRole('progressbar', {name: '대사 생성 진행률'})
  expect(status.textContent).toContain('100%')
  expect(status.textContent).not.toContain('150%')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('100')

  dialogueWorker.emit({type: 'ready'})
  await Promise.resolve()
  expect(dialogueWorker.client.generate).toHaveBeenCalledOnce()
  expect(status.textContent).toContain('대사 초안을 작성하고 있어요.')
  expect(
    screen.getByRole('progressbar', {name: '대사 생성 진행률'}).getAttribute('aria-valuenow'),
  ).toBe('0')

  dialogueWorker.emit({message: 'writer failed', restartRequired: false, type: 'error'})
  expect(status.textContent).toContain('writer failed')
  expect(screen.queryByRole('progressbar')).toBeNull()
})
