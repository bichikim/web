/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {type DialogueWriterController, useDialogueWriter} from '../features/dialogue-writer'
import {type ModelDownloadController, useModelDownload} from '../features/model-download'
import {isTextModelDownloaded} from '../features/text-generation'
import {PDialogueDraftGenerator} from '../components/dialogue-page/DraftGenerator'

vi.mock('../features/dialogue-writer', () => ({
  useDialogueWriter: vi.fn(),
}))

vi.mock('../features/model-download', () => ({
  useModelDownload: vi.fn(),
}))

vi.mock('../features/text-generation', async () => {
  const actual = await vi.importActual<typeof import('../features/text-generation')>(
    '../features/text-generation',
  )

  return {...actual, isTextModelDownloaded: vi.fn()}
})

vi.mock('src/components/p-modal/PModal', () => ({
  PModal: () => null,
}))

const createWriter = (): DialogueWriterController => ({
  canCopy: () => false,
  canGenerate: () => false,
  canPrepare: () => true,
  copyOutput: vi.fn(async () => undefined),
  generate: vi.fn(),
  generateWithPreparation: vi.fn(),
  isBusy: () => false,
  isModelReady: () => false,
  output: () => '',
  prepare: vi.fn(),
  progress: () => 0,
  release: vi.fn(),
  request: () => '',
  setRequest: vi.fn(),
  state: () => ({status: 'idle'}),
  statusMessage: () => '모델을 준비해 주세요.',
})

const createBackgroundDownload = (percentage: number): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  downloads: () => [],
  startImageModel: vi.fn(),
  startTextModel: vi.fn(),
  startVoiceModel: vi.fn(),
  state: () => ({
    label: 'Gemma 4 E2B',
    percentage,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  }),
})

it('should cap inline Gemma download progress shown in the draft generator', () => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...createWriter(),
    isBusy: () => true,
    state: () => ({
      files: [],
      loadedBytes: 150,
      percentage: 150,
      status: 'loading',
      totalBytes: 100,
    }),
    statusMessage: () => '모델 파일을 내려받고 있어요.',
  })
  vi.mocked(useModelDownload).mockReturnValue({
    cancel: vi.fn(),
    dismissError: vi.fn(),
    dispose: vi.fn(),
    downloads: () => [],
    startImageModel: vi.fn(),
    startTextModel: vi.fn(),
    startVoiceModel: vi.fn(),
    state: () => ({status: 'idle'}),
  } as ModelDownloadController)

  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain('100%')
  expect(screen.getByRole('status').textContent).not.toContain('150%')
})

it('should cap background Gemma download progress shown in the draft generator', () => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  vi.mocked(useModelDownload).mockReturnValue(createBackgroundDownload(120))

  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain('100%')
  expect(screen.getByRole('status').textContent).not.toContain('120%')
  expect(
    screen.getByRole('progressbar', {name: '대사 생성 진행률'}).getAttribute('aria-valuenow'),
  ).toBe('100')
})
