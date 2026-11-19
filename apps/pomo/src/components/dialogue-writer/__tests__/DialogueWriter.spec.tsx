/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, getOwner} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type DialogueWriterController,
  type DialogueWriterState,
  useDialogueWriter,
} from '../../../features/dialogue-writer'
import {getTextModel} from '../../../features/text-generation'
import {DialogueWriter} from '../DialogueWriter'
import {DirectAnswerHeader} from '../AnswerHeader'
import {ModelPanel} from '../ModelPanel'

vi.mock('../../../features/dialogue-writer', () => ({useDialogueWriter: vi.fn()}))
vi.mock('../../../features/text-generation', () => ({getTextModel: vi.fn()}))
vi.mock('../AnswerHeader', () => ({DirectAnswerHeader: vi.fn()}))
vi.mock('../ModelPanel', () => ({ModelPanel: vi.fn()}))

const MODEL_IDS = ['qwen-0.8b', 'qwen-2b', 'qwen-4b', 'gemma-4-e2b', 'gemma-4-e2b-mobile'] as const
const MODELS = MODEL_IDS.map((id) => ({description: '', downloadSize: '', id, label: id}))

interface WriterHarness {
  readonly controller: DialogueWriterController
  readonly setBusy: (value: boolean) => void
  readonly setModelReady: (value: boolean) => void
  readonly setState: (value: DialogueWriterState) => void
}

const createWriterHarness = (initialRequest = '초기 질문'): WriterHarness => {
  const [busy, setBusy] = createSignal(false)
  const [modelReady, setModelReady] = createSignal(false)
  const [request, setRequest] = createSignal(initialRequest)
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
    modelId: () => 'gemma-4-e2b',
    output: () => '',
    prepare: vi.fn(),
    progress: () => 0,
    release: vi.fn(),
    request,
    selectModel: vi.fn(),
    setRequest: vi.fn(setRequest),
    state,
    statusMessage: () => '',
  }

  return {controller, setBusy, setModelReady, setState}
}

const renderWriter = (writers: ReadonlyArray<WriterHarness>) => {
  const owners: ReturnType<typeof getOwner>[] = []
  for (const writer of writers) {
    vi.mocked(useDialogueWriter).mockImplementationOnce(() => {
      owners.push(getOwner())
      return writer.controller
    })
  }
  const result = render(() => <DialogueWriter />)
  return {...result, owners}
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTextModel).mockImplementation((id) => MODELS.find((model) => model.id === id)!)
  vi.mocked(DirectAnswerHeader).mockImplementation(() => <div data-testid="answer-header" />)
  vi.mocked(ModelPanel).mockImplementation((props: Parameters<typeof ModelPanel>[0]) => (
    <button
      data-disabled={String(props.disabled)}
      data-testid={`model-${props.model.id}`}
      onClick={props.onActivate}
      type="button"
    >
      {props.model.label}
    </button>
  ))
})

describe('DialogueWriter', () => {
  it('should initialize every model and synchronize request input', () => {
    const writers = MODEL_IDS.map((_, index) =>
      createWriterHarness(index === 0 ? '초기 질문' : `다른 질문 ${index}`),
    )
    const panelOwners: ReturnType<typeof getOwner>[] = []
    const renderPanel = vi.mocked(ModelPanel).getMockImplementation()!
    vi.mocked(ModelPanel).mockImplementation((props) => {
      panelOwners.push(getOwner())
      return renderPanel(props)
    })
    const {owners} = renderWriter(writers)

    expect(getTextModel).toHaveBeenCalledTimes(5)
    expect(vi.mocked(getTextModel).mock.calls).toEqual(MODEL_IDS.map((id) => [id]))
    expect(useDialogueWriter).toHaveBeenCalledTimes(5)
    expect(vi.mocked(useDialogueWriter).mock.calls).toEqual(
      MODEL_IDS.map((modelId) => [{initialRequest: '삶의 행복에 대해 이야기해줘', modelId}]),
    )
    const creationOrder = [
      ...vi.mocked(getTextModel).mock.invocationCallOrder,
      ...vi.mocked(useDialogueWriter).mock.invocationCallOrder,
    ]
    expect(creationOrder).toEqual([...creationOrder].sort((left, right) => left - right))
    expect(owners[0]).not.toBeNull()
    expect(owners.every((owner) => owner === owners[0])).toBe(true)
    expect(ModelPanel).toHaveBeenCalledTimes(5)
    expect(panelOwners.every((owner) => owner?.owner === owners[0])).toBe(true)
    vi.mocked(ModelPanel).mock.calls.forEach(([props], index) => {
      expect(props.model).toBe(MODELS[index])
      expect(props.writer).toBe(writers[index]!.controller)
    })
    const panels = screen.getAllByRole('button')
    expect(panels.map((panel) => panel.textContent)).toEqual(MODEL_IDS)
    expect(screen.getByTestId('answer-header')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === '5 / 800')).toBeInTheDocument()

    const textbox = screen.getByRole('textbox', {name: /^무엇을 물어볼까요\?/})
    expect(textbox).toHaveAttribute('maxlength', '800')
    expect(textbox).toHaveValue('초기 질문')
    fireEvent.input(textbox, {target: {value: '모두에게 전달할 질문'}})

    for (const writer of writers) {
      expect(writer.controller.setRequest).toHaveBeenCalledExactlyOnceWith('모두에게 전달할 질문')
      expect(vi.mocked(writer.controller.setRequest).mock.contexts[0]).toBe(writer.controller)
      expect(writer.controller.request()).toBe('모두에게 전달할 질문')
    }
    const inputOrder = writers.map(
      ({controller}) => vi.mocked(controller.setRequest).mock.invocationCallOrder[0]!,
    )
    expect(inputOrder).toEqual([...inputOrder].sort((left, right) => left - right))
    expect(
      screen.getByText((_, element) => element?.textContent === '11 / 800'),
    ).toBeInTheDocument()
    writers[1]!.controller.setRequest('두 번째 writer의 질문')
    expect(textbox).toHaveValue('모두에게 전달할 질문')
    writers[0]!.controller.setRequest('첫 질문')
    expect(textbox).toHaveValue('첫 질문')
    expect(screen.getByText((_, element) => element?.textContent === '4 / 800')).toBeInTheDocument()
    expect(getTextModel).toHaveBeenCalledTimes(5)
    expect(useDialogueWriter).toHaveBeenCalledTimes(5)
    expect(ModelPanel).toHaveBeenCalledTimes(5)
    screen.getAllByRole('button').forEach((panel, index) => {
      expect(panel).toBe(panels[index])
    })
  })

  it('should release other models and prepare each inactive model', () => {
    const writers = MODEL_IDS.map(() => createWriterHarness())
    const calls: string[] = []
    const releaseOrders = [
      [1, 2, 3, 4],
      [0, 2, 3, 4],
      [0, 1, 3, 4],
      [0, 1, 2, 4],
      [0, 1, 2, 3],
    ] as const
    writers.forEach(({controller}, index) => {
      vi.mocked(controller.release).mockImplementation(() => {
        calls.push(`release:${MODEL_IDS[index]}`)
      })
      vi.mocked(controller.prepare).mockImplementation(() => {
        calls.push(`prepare:${MODEL_IDS[index]}`)
      })
    })
    renderWriter(writers)

    MODEL_IDS.forEach((modelId, activeIndex) => {
      calls.length = 0
      fireEvent.click(screen.getByTestId(`model-${modelId}`))
      expect(calls).toEqual([
        ...releaseOrders[activeIndex]!.map((index) => `release:${MODEL_IDS[index]}`),
        `prepare:${modelId}`,
      ])
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
    const panels = screen.getAllByRole('button')

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
      expect(textbox).toBeEnabled()
      expect(getTextModel).toHaveBeenCalledTimes(5)
      expect(useDialogueWriter).toHaveBeenCalledTimes(5)
      expect(ModelPanel).toHaveBeenCalledTimes(5)
      screen.getAllByRole('button').forEach((panel, index) => {
        expect(panel).toBe(panels[index])
      })
    }
  })
})
