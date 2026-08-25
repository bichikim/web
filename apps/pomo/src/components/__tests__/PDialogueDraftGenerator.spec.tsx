/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {
  type DialogueWriterController,
  type DialogueWriterState,
  useDialogueWriter,
} from '../../features/dialogue-writer'
import {isTextModelDownloaded} from '../../features/text-generation'
import PDialogueDraftGenerator from '../dialogue-page/DraftGenerator'

vi.mock('../../features/dialogue-writer', () => ({
  useDialogueWriter: vi.fn(),
}))

vi.mock('../../features/text-generation', async () => {
  const actual: typeof import('../../features/text-generation') = await vi.importActual(
    '../../features/text-generation',
  )

  return {...actual, isTextModelDownloaded: vi.fn()}
})

vi.mock('src/components/PModal', () => ({PModal: vi.fn()}))

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

beforeEach(() => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('should request a script with the selected topic and length after download consent', async () => {
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ))
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  const onGenerated = vi.fn()
  render(() => <PDialogueDraftGenerator onGenerated={onGenerated} />)

  expect(useDialogueWriter).toHaveBeenCalledWith(expect.objectContaining({modelId: 'gemma-4-e2b'}))
  expect(screen.queryByText(/Gemma 4 E2B/)).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  fireEvent.input(screen.getByRole('slider', {name: '생성 분량'}), {
    target: {value: '180'},
  })
  fireEvent.input(screen.getByRole('textbox', {name: '어떤 말을 만들까요?'}), {
    target: {value: '집중을 시작하는 응원'},
  })
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  expect(writer.setRequest).toHaveBeenCalledWith(
    expect.stringContaining('주제: 집중을 시작하는 응원'),
  )
  expect(writer.setRequest).toHaveBeenCalledWith(expect.stringContaining('180자에 최대한 가깝게'))
  expect(writer.generateWithPreparation).not.toHaveBeenCalled()
  expect(await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  expect(writer.generateWithPreparation).toHaveBeenCalledTimes(1)

  const options = vi.mocked(useDialogueWriter).mock.calls[0]?.[0]
  options?.onComplete?.('오늘도 천천히 시작해 봐요.')
  expect(onGenerated).toHaveBeenCalledWith('오늘도 천천히 시작해 봐요.')
})

it('should generate without download consent when the Gemma model is already stored', async () => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(true)
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  await waitFor(() => expect(writer.generateWithPreparation).toHaveBeenCalledTimes(1))
  expect(isTextModelDownloaded).toHaveBeenCalledWith({modelId: 'gemma-4-e2b'})
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('should not continue generation after disposal during the stored-model check', async () => {
  let resolveDownloaded: (downloaded: boolean) => void = () => undefined
  vi.mocked(isTextModelDownloaded).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDownloaded = resolve
      }),
  )
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  const result = render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  result.unmount()
  resolveDownloaded(true)
  await Promise.resolve()

  expect(writer.generateWithPreparation).not.toHaveBeenCalled()
})

it('should expose the supported 50 to 300 character range', () => {
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  const slider = screen.getByRole('slider', {name: '생성 분량'})
  expect(slider.getAttribute('min')).toBe('50')
  expect(slider.getAttribute('max')).toBe('300')
  expect(slider.classList).toContain('accent-highlight')
  expect(screen.getByRole('status').textContent).toContain(
    '주제와 분량을 정한 뒤 대사 만들기를 눌러 주세요.',
  )
})

it('should describe model startup after the download reaches 100 percent', () => {
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...writer,
    isBusy: () => true,
    state: () => ({
      files: [],
      loadedBytes: 100,
      percentage: 100,
      status: 'loading',
      totalBytes: 100,
    }),
    statusMessage: () => '다운로드 완료 · 모델 시작 중…',
  })
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain(
    '받은 대사 모델을 실행할 준비를 하고 있어요.',
  )
  expect(screen.getByRole('status').textContent).toContain('100%')
  expect(screen.getByRole('button', {name: '대사 만들기'}).hasAttribute('disabled')).toBe(true)
})

it('should show character-based progress while generating and 100 percent on completion', async () => {
  vi.useFakeTimers()
  const [state, setState] = createSignal<DialogueWriterState>({status: 'generating'})
  const [output, setOutput] = createSignal('')
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...writer,
    isBusy: () => state().status === 'generating',
    output,
    state,
  })
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('button', {name: '대사 만들기'})).toBeDefined()
  expect(screen.getByRole('status').textContent).toContain('대사 초안을 작성하고 있어요.')
  const progressbar = screen.getByRole('progressbar', {name: '대사 생성 진행률'})
  expect(progressbar.getAttribute('aria-valuenow')).toBe('0')

  setOutput('가'.repeat(60))
  await Promise.resolve()
  expect(screen.getByRole('status').textContent).toContain('대사 초안을 작성하고 있어요.')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('48')

  setOutput('가'.repeat(120))
  await Promise.resolve()
  expect(screen.getByRole('status').textContent).toContain('96%')

  vi.advanceTimersByTime(700)
  expect(screen.getByRole('status').textContent).toContain('문장을 자연스럽게 마무리하고 있어요.')
  expect(screen.getByRole('status').textContent).toContain('97%')

  vi.advanceTimersByTime(700)
  expect(screen.getByRole('status').textContent).toContain('98%')

  vi.advanceTimersByTime(700)
  expect(screen.getByRole('status').textContent).toContain(
    '완성된 초안을 대사 입력창에 반영하고 있어요.',
  )
  expect(screen.getByRole('status').textContent).toContain('99%')

  vi.advanceTimersByTime(5_000)
  expect(screen.getByRole('status').textContent).toContain('99%')

  setState({status: 'complete'})
  await Promise.resolve()
  expect(screen.getByRole('status').textContent).toContain(
    '완성된 초안을 대사 입력창에 반영했어요.',
  )
  expect(screen.getByRole('status').textContent).toContain('100%')
  expect(progressbar.getAttribute('aria-valuenow')).toBe('100')
})

it('should keep the optional draft controls collapsed until requested', () => {
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  const result = render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)

  const toggle = screen.getByRole('button', {name: /초안 만들기/})
  const content = result.container.querySelector('#dialogue-draft-content')

  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(content?.hasAttribute('hidden')).toBe(true)

  fireEvent.click(toggle)

  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(content?.hasAttribute('hidden')).toBe(false)
})
