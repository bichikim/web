/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/p-modal/PModal'
import {
  type DialogueWriterController,
  type DialogueWriterState,
  useDialogueWriter,
} from 'src/features/dialogue-writer'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from 'src/features/model-download'
import type {DefaultTextModelId} from 'src/features/text-generation/settings'
import {isTextModelDownloaded} from 'src/features/text-generation'
import {useDefaultTextModel} from 'src/features/text-generation/use-default-text-model'
import type {TextModelId} from 'src/features/text-generation/model'

import {PDialogueDraftGenerator} from '../DraftGenerator'

const supportMocks = vi.hoisted(() => ({supportsWebGpu: vi.fn(() => true)}))

vi.mock('src/features/dialogue-writer', () => ({useDialogueWriter: vi.fn()}))
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/text-generation', () => ({
  getTextModel: () => ({downloadSize: '약 3.7GB'}),
  isTextModelDownloaded: vi.fn(),
}))
vi.mock('src/features/text-generation/use-default-text-model', () => ({
  useDefaultTextModel: vi.fn(),
}))
vi.mock('src/features/text-generation/environment', () => ({
  supportsWebGpu: supportMocks.supportsWebGpu,
}))
vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))

const createWriter = (
  initialModelId: TextModelId,
  initialState: DialogueWriterState,
): DialogueWriterController => {
  const [modelId, setModelId] = createSignal(initialModelId)
  const [state, setState] = createSignal(initialState)

  return {
    canCopy: () => false,
    canGenerate: () => false,
    canPrepare: () => true,
    copyOutput: vi.fn(async () => undefined),
    generate: vi.fn(),
    generateWithPreparation: vi.fn(),
    isBusy: () => state().status === 'loading' || state().status === 'generating',
    isModelReady: () => state().status === 'ready',
    modelId,
    output: () => '',
    prepare: vi.fn(),
    progress: () => 0,
    release: vi.fn(),
    request: () => '',
    selectModel: vi.fn((nextModelId) => {
      setModelId(nextModelId)
      setState(nextModelId === 'gemma-4-e2b' ? {status: 'unsupported'} : {status: 'idle'})
    }),
    setRequest: vi.fn(),
    state,
    statusMessage: () => '이 기기에서는 대사 모델을 사용할 수 없어요.',
  }
}

const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  downloads: () => [],
  startImageModel: vi.fn(),
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  startVoiceModel: vi.fn(),
  state: () => ({status: 'idle'}),
})

beforeEach(() => {
  supportMocks.supportsWebGpu.mockReturnValue(true)
  vi.mocked(useDefaultTextModel).mockReturnValue(() => 'gemma-4-e2b')
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
  vi.mocked(useModelDownload).mockReturnValue(createModelDownload())
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ))
})

it('does not prompt to download when the current default changes from ready LFM to unsupported Gemma', async () => {
  const [defaultModelId, setDefaultModelId] = createSignal<DefaultTextModelId>('lfm-2.6b-qad')
  const writer = createWriter('lfm-2.6b-qad', {status: 'ready'})
  vi.mocked(useDefaultTextModel).mockReturnValue(defaultModelId)
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  supportMocks.supportsWebGpu.mockReturnValue(false)
  setDefaultModelId('gemma-4-e2b')
  const generate = screen.getByRole('button', {name: '대사 만들기'})

  expect(generate).toBeDisabled()
  generate.removeAttribute('disabled')
  fireEvent.click(generate)
  await Promise.resolve()

  expect(writer.selectModel).not.toHaveBeenCalled()
  expect(isTextModelDownloaded).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('clears the stale unsupported message after the current default changes from Gemma to LFM', () => {
  const [defaultModelId, setDefaultModelId] = createSignal<DefaultTextModelId>('gemma-4-e2b')
  supportMocks.supportsWebGpu.mockReturnValue(false)
  vi.mocked(useDefaultTextModel).mockReturnValue(defaultModelId)
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter('gemma-4-e2b', {status: 'unsupported'}))
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  setDefaultModelId('lfm-2.6b-qad')

  expect(screen.getByRole('status').textContent).toContain(
    '주제와 분량을 정한 뒤 대사 만들기를 눌러 주세요.',
  )
  expect(screen.getByRole('status').textContent).not.toContain(
    '이 기기에서는 대사 모델을 사용할 수 없어요.',
  )
  expect(screen.getByRole('button', {name: '대사 만들기'})).toBeEnabled()
})

it('does not open stale consent when the current default changes during the stored-model check', async () => {
  const [defaultModelId, setDefaultModelId] = createSignal<DefaultTextModelId>('lfm-2.6b-qad')
  let resolveDownloaded: (downloaded: boolean) => void = () => undefined
  const writer = createWriter('lfm-2.6b-qad', {status: 'idle'})
  vi.mocked(useDefaultTextModel).mockReturnValue(defaultModelId)
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  vi.mocked(isTextModelDownloaded).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDownloaded = resolve
      }),
  )
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  expect(isTextModelDownloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'})
  supportMocks.supportsWebGpu.mockReturnValue(false)
  setDefaultModelId('gemma-4-e2b')
  resolveDownloaded(false)

  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toContain('WebGPU를 사용할 수 없어요.'),
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(writer.generateWithPreparation).not.toHaveBeenCalled()
})

it('keeps Cloud supported without assuming a successful inference', async () => {
  const [defaultModelId] = createSignal<DefaultTextModelId>('cloud')
  const writer = createWriter('gemma-4-e2b', {status: 'unsupported'})
  const modelDownload = createModelDownload()
  vi.mocked(useDefaultTextModel).mockReturnValue(defaultModelId)
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  const generate = screen.getByRole('button', {name: '대사 만들기'})
  expect(generate).toBeEnabled()
  fireEvent.click(generate)

  await waitFor(() => expect(writer.generateWithPreparation).toHaveBeenCalledOnce())
  expect(writer.selectModel).toHaveBeenCalledWith('cloud')
  expect(isTextModelDownloaded).toHaveBeenCalledWith({modelId: 'cloud'})
  expect(writer.generate).not.toHaveBeenCalled()
  expect(modelDownload.startTextModel).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows the current model support status instead of an old model download error', async () => {
  const [defaultModelId, setDefaultModelId] = createSignal<DefaultTextModelId>('lfm-2.6b-qad')
  const writer = createWriter('lfm-2.6b-qad', {status: 'idle'})
  const modelDownload = createModelDownload()
  vi.mocked(useDefaultTextModel).mockReturnValue(defaultModelId)
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
  vi.mocked(modelDownload.startTextModel).mockResolvedValue({
    message: 'The LFM download failed.',
    status: 'error',
  })
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))

  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toContain('The LFM download failed.'),
  )

  supportMocks.supportsWebGpu.mockReturnValue(false)
  setDefaultModelId('gemma-4-e2b')

  expect(screen.getByRole('status').textContent).toContain('WebGPU를 사용할 수 없어요.')
  expect(screen.getByRole('status').textContent).not.toContain('The LFM download failed.')
  expect(screen.getByRole('button', {name: '대사 만들기'})).toBeDisabled()
})
