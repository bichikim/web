/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type PDialogueEditorController,
  usePDialogueEditor,
} from '../../features/focus-room-dialogue'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from '../../features/model-download'
import {isSupertonicModelDownloaded} from '../../features/supertonic'
import type {PModelDownloadConsentProps} from '../PModelDownloadConsent'
import PDialogueEditor from '../dialogue-page/Editor'

vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children?: JSX.Element; readonly href: string}) => (
    <a href={props.href}>{props.children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../../features/focus-room-animation', () => ({
  usePSceneStyle: () => ({sceneStyle: () => 'cozy'}),
}))

vi.mock('../../features/focus-room-dialogue', () => ({
  usePDialogueEditor: vi.fn(),
  usePEvents: () => ({refreshDialogues: vi.fn(async () => undefined)}),
}))

vi.mock('../../features/model-download', () => ({
  useModelDownload: vi.fn(),
}))

vi.mock('../../features/supertonic', async () => {
  const actual: typeof import('../../features/supertonic') = await vi.importActual(
    '../../features/supertonic',
  )

  return {...actual, isSupertonicModelDownloaded: vi.fn()}
})

vi.mock('../dialogue-page/DraftGenerator', () => ({default: () => null}))
vi.mock('../PModelDownloadConsent', () => ({
  PModelDownloadConsent: (props: PModelDownloadConsentProps) => (
    <Show when={props.isOpen}>
      <button onClick={props.onConfirm} type="button">
        받고 시작
      </button>
    </Show>
  ),
}))

const createEditor = (): PDialogueEditorController => ({
  audioUrl: () => null,
  canGenerate: () => true,
  canRegenerateSegments: () => false,
  canSave: () => false,
  dialogueId: () => null,
  durationMs: () => 0,
  generate: vi.fn(async () => undefined),
  language: () => 'ko',
  modelId: () => 'full',
  progress: () => 0,
  regenerateSegment: vi.fn(async () => undefined),
  regeneratingSegmentIndex: () => null,
  save: vi.fn(async () => null),
  segments: () => [],
  setLanguage: vi.fn(),
  setModelId: vi.fn(),
  setText: vi.fn(),
  setVoiceId: vi.fn(),
  state: () => ({message: '대사를 입력한 뒤 음성 만들기를 눌러 주세요.', status: 'idle'}),
  text: () => '오늘도 잘할 수 있어요.',
  voiceId: () => 'F1',
})

const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  startVoiceModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  state: () => ({status: 'idle'}),
})

beforeEach(() => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  vi.mocked(useModelDownload).mockReturnValue(createModelDownload())
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should link directly to the Pomofi root', () => {
  vi.mocked(usePDialogueEditor).mockReturnValue(createEditor())
  render(() => <PDialogueEditor dialogueId={null} />)

  expect(screen.getByRole('link', {name: '앱으로 돌아가기'}).getAttribute('href')).toBe('/')
})

it('should not start audio generation after disposal during the stored-model check', async () => {
  let resolveDownloaded: (downloaded: boolean) => void = () => undefined
  vi.mocked(isSupertonicModelDownloaded).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDownloaded = resolve
      }),
  )
  const editor = createEditor()
  vi.mocked(usePDialogueEditor).mockReturnValue(editor)
  const result = render(() => <PDialogueEditor dialogueId={null} />)

  fireEvent.click(screen.getByRole('button', {name: '음성 만들기'}))
  result.unmount()
  resolveDownloaded(true)
  await Promise.resolve()

  expect(editor.generate).not.toHaveBeenCalled()
})

it('should generate after the root-owned voice model download completes', async () => {
  const editor = createEditor()
  const modelDownload = createModelDownload()
  vi.mocked(usePDialogueEditor).mockReturnValue(editor)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  render(() => <PDialogueEditor dialogueId={null} />)

  fireEvent.click(screen.getByRole('button', {name: '음성 만들기'}))
  fireEvent.click(await screen.findByRole('button', {name: '받고 시작'}))

  await waitFor(() => expect(editor.generate).toHaveBeenCalledTimes(1))
  expect(modelDownload.startVoiceModel).toHaveBeenCalledWith('full')
})

it('should leave the voice model download running after the editor is disposed', async () => {
  let resolveDownload: (result: {readonly status: 'complete'}) => void = () => undefined
  const editor = createEditor()
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.startVoiceModel).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDownload = resolve
      }),
  )
  vi.mocked(usePDialogueEditor).mockReturnValue(editor)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  const result = render(() => <PDialogueEditor dialogueId={null} />)

  fireEvent.click(screen.getByRole('button', {name: '음성 만들기'}))
  fireEvent.click(await screen.findByRole('button', {name: '받고 시작'}))
  result.unmount()
  resolveDownload({status: 'complete'})
  await Promise.resolve()

  expect(modelDownload.cancel).not.toHaveBeenCalled()
  expect(modelDownload.dispose).not.toHaveBeenCalled()
  expect(editor.generate).not.toHaveBeenCalled()
})
