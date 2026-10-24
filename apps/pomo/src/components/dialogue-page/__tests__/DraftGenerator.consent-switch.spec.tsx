/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, mergeProps} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import * as PModalModule from 'src/components/p-modal/PModal'
import {type DialogueWriterState, useDialogueWriter} from 'src/features/dialogue-writer'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from 'src/features/model-download'
import type {DefaultTextModelId} from 'src/features/text-generation/settings'
import {getTextModel, isTextModelDownloaded} from 'src/features/text-generation'
import {useDefaultTextModel} from 'src/features/text-generation/use-default-text-model'
import type {TextModelId} from 'src/features/text-generation/model'

import {PDialogueDraftGenerator} from '../DraftGenerator'

const mocks = vi.hoisted(() => ({
  getTextModel: vi.fn((modelId: string) => ({
    downloadSize: modelId === 'cloud' ? 'about 200MB' : 'about 3.7GB',
  })),
  supportsWebGpu: vi.fn(() => true),
}))

vi.mock('src/features/dialogue-writer', () => ({useDialogueWriter: vi.fn()}))
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/text-generation', () => ({
  getTextModel: mocks.getTextModel,
  isTextModelDownloaded: vi.fn(),
}))
vi.mock('src/features/text-generation/use-default-text-model', () => ({
  useDefaultTextModel: vi.fn(),
}))
vi.mock('src/features/text-generation/environment', () => ({
  supportsWebGpu: mocks.supportsWebGpu,
}))

const createWriter = (initialModelId: TextModelId, initialState: DialogueWriterState) => {
  const [modelId, setModelId] = createSignal(initialModelId)
  const [state, setState] = createSignal(initialState)
  const generateWithPreparation = vi.fn(() => {
    setState({status: 'complete'})
    return modelId()
  })

  return {
    canCopy: () => false,
    canGenerate: () => false,
    canPrepare: () => true,
    copyOutput: vi.fn(async () => undefined),
    generate: vi.fn(),
    generateWithPreparation,
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
      setState({status: 'idle'})
    }),
    setRequest: vi.fn(),
    state,
    statusMessage: () => '',
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
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
  mocks.getTextModel.mockClear()
  mocks.supportsWebGpu.mockReturnValue(true)
  vi.mocked(useDefaultTextModel).mockReturnValue(() => 'lfm-2.6b-qad')
  vi.mocked(isTextModelDownloaded).mockImplementation(async ({modelId}) => modelId === 'cloud')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('keeps consent and its size bound to the selected model across an LFM → Cloud → LFM round-trip', async () => {
  const actualPModal = PModalModule.PModal
  const onOpenChange = vi.fn()
  vi.spyOn(PModalModule, 'PModal').mockImplementation((props) =>
    actualPModal(
      mergeProps(props, {
        onOpenChange: (isOpen: boolean) => {
          onOpenChange(isOpen)
          props.onOpenChange(isOpen)
        },
      }),
    ),
  )

  const [defaultModelId, setDefaultModelId] = createSignal<DefaultTextModelId>('lfm-2.6b-qad')
  const writer = createWriter('lfm-2.6b-qad', {status: 'idle'})
  const modelDownload = createModelDownload()
  vi.mocked(useDefaultTextModel).mockReturnValue(defaultModelId)
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)

  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await waitFor(() => expect(isTextModelDownloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'}))
  await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})

  setDefaultModelId('cloud')
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-closed'))
  expect(onOpenChange).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await waitFor(() =>
    expect(writer.generateWithPreparation.mock.results.map(({value}) => value)).toEqual(['cloud']),
  )
  expect(modelDownload.startTextModel).not.toHaveBeenCalled()

  setDefaultModelId('lfm-2.6b-qad')
  await Promise.resolve()
  await Promise.resolve()
  expect(screen.getByRole('dialog')).toHaveAttribute('data-closed')

  fireEvent.click(screen.getByRole('button', {hidden: true, name: '받고 시작'}))
  await Promise.resolve()
  expect(onOpenChange).not.toHaveBeenCalled()
  expect(modelDownload.startTextModel).not.toHaveBeenCalled()
  expect(writer.generateWithPreparation.mock.results.map(({value}) => value)).toEqual(['cloud'])

  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await waitFor(() => expect(isTextModelDownloaded).toHaveBeenCalledTimes(3))
  const consent = await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  await waitFor(() => expect(consent).not.toHaveAttribute('data-closed'))
  expect(getTextModel).toHaveBeenLastCalledWith('lfm-2.6b-qad')

  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  await waitFor(() => expect(modelDownload.startTextModel).toHaveBeenCalledWith('lfm-2.6b-qad'))
  await waitFor(() =>
    expect(writer.generateWithPreparation.mock.results.map(({value}) => value)).toEqual([
      'cloud',
      'lfm-2.6b-qad',
    ]),
  )
})
