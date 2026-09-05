/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {
  type DialogueWriterController,
  type DialogueWriterState,
  useDialogueWriter,
} from '../../../features/dialogue-writer'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  type ModelDownloadState,
  useModelDownload,
} from '../../../features/model-download'
import {isTextModelDownloaded} from '../../../features/text-generation'
import PDialogueDraftGenerator from '../DraftGenerator'

vi.mock('../../../features/dialogue-writer', () => ({
  useDialogueWriter: vi.fn(),
}))

vi.mock('../../../features/model-download', () => ({
  useModelDownload: vi.fn(),
}))

vi.mock('../../../features/text-generation', async () => {
  const actual: typeof import('../../../features/text-generation') = await vi.importActual(
    '../../../features/text-generation',
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

const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  downloads: () => [],
  startImageModel: vi.fn(),
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  startVoiceModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  state: () => ({status: 'idle'}),
})

beforeEach(() => {
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

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('should request a script with the selected topic and length after download consent', async () => {
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  const onGenerated = vi.fn()
  const result = render(() => <PDialogueDraftGenerator onGenerated={onGenerated} />)

  expect(useDialogueWriter).toHaveBeenCalledWith(expect.objectContaining({modelId: 'gemma-4-e2b'}))
  expect(result.container.querySelector('section')).toHaveClass('bg-content-surface')
  expect(screen.getByRole('button', {name: /초안 만들기/})).toHaveClass('text-foreground')
  expect(screen.queryByText(/Gemma 4 E2B/)).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('textbox', {name: '어떤 말을 만들까요?'}).closest('label')).toHaveClass(
    '[&_input[type=text]]:bg-surface-strong',
    '[&_input[type=text]]:text-foreground',
  )

  fireEvent.input(screen.getByRole('slider', {name: '생성 분량'}), {
    target: {value: '180'},
  })
  fireEvent.input(screen.getByRole('textbox', {name: '어떤 말을 만들까요?'}), {
    target: {value: '집중을 시작하는 응원'},
  })
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  expect(writer.setRequest).toHaveBeenCalledWith(
    '사용자 요청: 집중을 시작하는 응원\n생성 분량: 180자',
  )
  expect(writer.generateWithPreparation).not.toHaveBeenCalled()
  expect(await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  await waitFor(() => expect(writer.generateWithPreparation).toHaveBeenCalledTimes(1))

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

it('should leave the root-owned download running after the page is disposed', async () => {
  let resolveDownload: (result: {readonly status: 'complete'}) => void = () => undefined
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.startTextModel).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDownload = resolve
      }),
  )
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  const result = render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))

  result.unmount()
  resolveDownload({status: 'complete'})
  await Promise.resolve()

  expect(modelDownload.cancel).not.toHaveBeenCalled()
  expect(modelDownload.dispose).not.toHaveBeenCalled()
  expect(writer.generateWithPreparation).not.toHaveBeenCalled()
})

it('should explain that a model download continues after returning home', () => {
  const modelDownload = createModelDownload()
  vi.mocked(useModelDownload).mockReturnValue({
    ...modelDownload,
    state: () => ({
      label: 'Gemma 4 E2B',
      percentage: 42,
      status: 'loading',
      target: {kind: 'text', modelId: 'gemma-4-e2b'},
    }),
  })
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(
    screen.getByText(
      '대사 모델 파일을 백그라운드에서 내려받고 있어요. 메인으로 이동해도 백그라운드에서 계속 받아요.',
    ),
  ).toBeDefined()
})

it('should cancel the active draft model download and re-enable the controls', async () => {
  const [downloadState, setDownloadState] = createSignal<ModelDownloadState>({
    label: 'Gemma 4 E2B',
    percentage: 42,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.cancel).mockImplementation(() => setDownloadState({status: 'idle'}))
  vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('textbox', {name: '어떤 말을 만들까요?'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  expect(modelDownload.cancel).toHaveBeenCalledOnce()
  await waitFor(() =>
    expect(screen.getByRole('textbox', {name: '어떤 말을 만들까요?'})).toBeEnabled(),
  )
  expect(screen.getByRole('button', {name: '대사 만들기'})).toBeEnabled()
})

it('should not generate after the global download is cancelled', async () => {
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.startTextModel).mockResolvedValue({status: 'cancelled'})
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
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
  expect(screen.queryByRole('button', {name: '취소'})).toBeNull()
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

it('should report model download errors and let the user cancel consent', async () => {
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.startTextModel).mockResolvedValue({
    message: '모델 다운로드를 시작하지 못했어요.',
    status: 'error',
  })
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))
  await screen.findByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))

  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toContain('모델 다운로드를 시작하지 못했어요.'),
  )
})

it('should generate immediately when the writer model is ready', async () => {
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...writer,
    isModelReady: () => true,
    state: () => ({status: 'ready'}),
  })
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain('대사 모델이 준비됐어요.')
  fireEvent.click(screen.getByRole('button', {name: '대사 만들기'}))

  expect(writer.generateWithPreparation).toHaveBeenCalledOnce()
  expect(isTextModelDownloaded).not.toHaveBeenCalled()
})

it('should join the active draft model download before generating', async () => {
  const writer = createWriter()
  const modelDownload = {
    ...createModelDownload(),
    state: () =>
      ({
        label: 'Gemma 4 E2B',
        percentage: 42,
        status: 'loading',
        target: {kind: 'text', modelId: 'gemma-4-e2b'},
      }) satisfies ModelDownloadState,
  }
  vi.mocked(useDialogueWriter).mockReturnValue(writer)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))
  const generateButton = screen.getByRole('button', {name: '대사 만들기'})
  generateButton.removeAttribute('disabled')

  fireEvent.click(generateButton)

  await waitFor(() => expect(writer.generateWithPreparation).toHaveBeenCalledOnce())
  expect(modelDownload.startTextModel).toHaveBeenCalledWith('gemma-4-e2b')
  expect(isTextModelDownloaded).not.toHaveBeenCalled()
})

it('should explain writer errors and unsupported models', () => {
  const errorWriter = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...errorWriter,
    state: () => ({message: '대사 모델을 시작하지 못했어요.', modelReady: false, status: 'error'}),
  })
  const errorView = render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain('대사 모델을 시작하지 못했어요.')
  errorView.unmount()

  const unsupportedWriter = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...unsupportedWriter,
    state: () => ({status: 'unsupported'}),
    statusMessage: () => '이 기기에서는 대사 모델을 사용할 수 없어요.',
  })
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain(
    '이 기기에서는 대사 모델을 사용할 수 없어요.',
  )
  expect(screen.getByRole('button', {name: '대사 만들기'}).hasAttribute('disabled')).toBe(true)
})

it('should keep unrelated model downloads out of the draft download status', () => {
  const [downloadState, setDownloadState] = createSignal<ModelDownloadState>({
    label: '음성 모델',
    percentage: 42,
    status: 'loading',
    target: {kind: 'voice', modelId: 'full'},
  })
  const modelDownload = createModelDownload()
  vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
  vi.mocked(useDialogueWriter).mockReturnValue(createWriter())
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain(
    '주제와 분량을 정한 뒤 대사 만들기를 눌러 주세요.',
  )

  setDownloadState({
    label: 'Gemma 4 E2B Mobile',
    percentage: 42,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b-mobile'},
  })

  expect(screen.getByRole('status').textContent).toContain(
    '주제와 분량을 정한 뒤 대사 만들기를 눌러 주세요.',
  )
  expect(screen.queryByRole('button', {name: '취소'})).toBeNull()
})

it('should describe a partial writer model download', () => {
  const writer = createWriter()
  vi.mocked(useDialogueWriter).mockReturnValue({
    ...writer,
    isBusy: () => true,
    state: () => ({files: [], loadedBytes: 42, percentage: 42, status: 'loading', totalBytes: 100}),
  })
  render(() => <PDialogueDraftGenerator onGenerated={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: /초안 만들기/}))

  expect(screen.getByRole('status').textContent).toContain('대사 모델 파일을 내려받고 있어요.')
  expect(screen.getByRole('status').textContent).toContain('42%')
})
