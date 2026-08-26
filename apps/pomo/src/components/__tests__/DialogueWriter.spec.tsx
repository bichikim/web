/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type DialogueWriterController,
  type DialogueWriterState,
  useDialogueWriter,
} from '../../features/dialogue-writer'
import {getTextModel} from '../../features/text-generation'
import DialogueWriter from '../DialogueWriter'
import {DirectAnswerHeader} from '../dialogue-writer/AnswerHeader'
import {ModelPanel} from '../dialogue-writer/ModelPanel'

vi.mock('../../features/dialogue-writer', () => ({useDialogueWriter: vi.fn()}))
vi.mock('../../features/text-generation', () => ({getTextModel: vi.fn()}))
vi.mock('../dialogue-writer/AnswerHeader', () => ({DirectAnswerHeader: vi.fn()}))
vi.mock('../dialogue-writer/ModelPanel', () => ({ModelPanel: vi.fn()}))

const MODEL_IDS = ['qwen-0.8b', 'qwen-2b', 'qwen-4b', 'gemma-4-e2b', 'gemma-4-e2b-mobile'] as const

interface WriterHarness {
  readonly controller: DialogueWriterController
  readonly setBusy: (value: boolean) => void
  readonly setModelReady: (value: boolean) => void
  readonly setState: (value: DialogueWriterState) => void
}

const createWriterHarness = (): WriterHarness => {
  const [busy, setBusy] = createSignal(false)
  const [modelReady, setModelReady] = createSignal(false)
  const [request, setRequest] = createSignal('초기 질문')
  const [state, setState] = createSignal<DialogueWriterState>({status: 'idle'})
  const controller: DialogueWriterController = {
    canCopy: () => false,
    canGenerate: () => true,
    canPrepare: () => true,
    copyOutput: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn(),
    generateWithPreparation: vi.fn(),
    isBusy: busy,
    isModelReady: modelReady,
    output: () => '',
    prepare: vi.fn(),
    progress: () => 0,
    release: vi.fn(),
    request,
    setRequest: vi.fn(setRequest),
    state,
    statusMessage: () => '',
  }

  return {controller, setBusy, setModelReady, setState}
}

const renderWriter = (writers: ReadonlyArray<WriterHarness>) => {
  vi.mocked(useDialogueWriter).mockImplementationOnce(() => writers[0]!.controller)
  vi.mocked(useDialogueWriter).mockImplementationOnce(() => writers[1]!.controller)
  vi.mocked(useDialogueWriter).mockImplementationOnce(() => writers[2]!.controller)
  vi.mocked(useDialogueWriter).mockImplementationOnce(() => writers[3]!.controller)
  vi.mocked(useDialogueWriter).mockImplementationOnce(() => writers[4]!.controller)
  return render(() => <DialogueWriter />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTextModel).mockImplementation((id) => ({id, label: id}) as never)
  vi.mocked(DirectAnswerHeader).mockImplementation(() => <div data-testid="answer-header" />)
  vi.mocked(ModelPanel).mockImplementation((props: Parameters<typeof ModelPanel>[0]) => (
    <button
      data-disabled={String(props.disabled)}
      data-testid={`model-${props.model.id}`}
      onClick={props.onActivate}
      type="button"
    >
      {props.writer.request()}
    </button>
  ))
})

describe('DialogueWriter', () => {
  it('should initialize every model and synchronize request input', () => {
    const writers = MODEL_IDS.map(() => createWriterHarness())
    renderWriter(writers)

    expect(getTextModel).toHaveBeenCalledTimes(5)
    expect(vi.mocked(getTextModel).mock.calls.map(([id]) => id)).toEqual(MODEL_IDS)
    expect(useDialogueWriter).toHaveBeenCalledTimes(5)
    expect(vi.mocked(useDialogueWriter).mock.calls).toEqual(
      MODEL_IDS.map((modelId) => [{initialRequest: '삶의 행복에 대해 이야기해줘', modelId}]),
    )
    expect(screen.getByTestId('answer-header')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === '5 / 800')).toBeInTheDocument()

    const textbox = screen.getByRole('textbox', {name: /^무엇을 물어볼까요\?/})
    expect(textbox).toHaveAttribute('maxlength', '800')
    expect(textbox).toHaveValue('초기 질문')
    fireEvent.input(textbox, {target: {value: '모두에게 전달할 질문'}})

    for (const writer of writers) {
      expect(writer.controller.setRequest).toHaveBeenCalledWith('모두에게 전달할 질문')
    }
    expect(
      screen.getByText((_, element) => element?.textContent === '11 / 800'),
    ).toBeInTheDocument()
  })

  it('should release other models and prepare each inactive model', () => {
    const writers = MODEL_IDS.map(() => createWriterHarness())
    renderWriter(writers)

    MODEL_IDS.forEach((modelId, activeIndex) => {
      fireEvent.click(screen.getByTestId(`model-${modelId}`))
      expect(writers[activeIndex]!.controller.prepare).toHaveBeenCalledOnce()
      expect(writers[activeIndex]!.controller.generate).not.toHaveBeenCalled()
    })
    for (const writer of writers) {
      expect(writer.controller.release).toHaveBeenCalledTimes(4)
    }
  })

  it('should generate immediately for every ready model', () => {
    const writers = MODEL_IDS.map(() => createWriterHarness())
    for (const writer of writers) {
      writer.setModelReady(true)
    }
    renderWriter(writers)

    MODEL_IDS.forEach((modelId, index) => {
      fireEvent.click(screen.getByTestId(`model-${modelId}`))
      expect(writers[index]!.controller.generate).toHaveBeenCalledOnce()
      expect(writers[index]!.controller.prepare).not.toHaveBeenCalled()
    })
    expect(
      writers.every((writer) => vi.mocked(writer.controller.release).mock.calls.length === 0),
    ).toBe(true)
  })

  it('should disable the input and every panel except the loading model', () => {
    const writers = MODEL_IDS.map(() => createWriterHarness())
    renderWriter(writers)
    const textbox = screen.getByRole('textbox', {name: /^무엇을 물어볼까요\?/})

    expect(textbox).toBeEnabled()
    for (const modelId of MODEL_IDS) {
      expect(screen.getByTestId(`model-${modelId}`)).toHaveAttribute('data-disabled', 'false')
    }

    for (const [loadingIndex, modelId] of MODEL_IDS.entries()) {
      writers[loadingIndex]!.setBusy(true)
      writers[loadingIndex]!.setState({
        files: [],
        loadedBytes: 25,
        percentage: 25,
        status: 'loading',
        totalBytes: 100,
      })

      expect(textbox).toBeDisabled()
      expect(screen.getByTestId(`model-${modelId}`)).toHaveAttribute('data-disabled', 'false')
      MODEL_IDS.forEach((otherModelId, otherIndex) => {
        if (otherIndex !== loadingIndex) {
          expect(screen.getByTestId(`model-${otherModelId}`)).toHaveAttribute(
            'data-disabled',
            'true',
          )
        }
      })

      writers[loadingIndex]!.setBusy(false)
      writers[loadingIndex]!.setState({status: 'idle'})
    }
  })
})
