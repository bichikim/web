/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type PDialogueEditorController,
  usePDialogueEditor,
} from '../../features/focus-room-dialogue'
import {isSupertonicModelDownloaded} from '../../features/supertonic'
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

vi.mock('../../features/supertonic', async () => {
  const actual: typeof import('../../features/supertonic') = await vi.importActual(
    '../../features/supertonic',
  )

  return {...actual, isSupertonicModelDownloaded: vi.fn()}
})

vi.mock('../dialogue-page/DraftGenerator', () => ({default: () => null}))
vi.mock('../PModelDownloadConsent', () => ({PModelDownloadConsent: () => null}))

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

afterEach(() => {
  vi.clearAllMocks()
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
