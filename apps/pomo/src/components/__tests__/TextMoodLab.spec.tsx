/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type TextMoodController, type TextMoodState, useTextMood} from '../../features/text-mood'
import TextMoodLab from '../TextMoodLab'
import {TextMoodAnalysisResult} from '../text-mood-lab/AnalysisResult'
import {TextMoodEvaluation} from '../text-mood-lab/Evaluation'
import {TextMoodInsufficientResult} from '../text-mood-lab/InsufficientResult'

vi.mock('../../features/text-mood', () => ({useTextMood: vi.fn()}))
vi.mock('../text-mood-lab/AnalysisResult', () => ({TextMoodAnalysisResult: vi.fn()}))
vi.mock('../text-mood-lab/Evaluation', () => ({TextMoodEvaluation: vi.fn()}))
vi.mock('../text-mood-lab/InsufficientResult', () => ({TextMoodInsufficientResult: vi.fn()}))

interface MoodHarness {
  readonly controller: TextMoodController
  readonly setBusy: (value: boolean) => void
  readonly setCanAnalyze: (value: boolean) => void
  readonly setProgress: (value: number) => void
  readonly setState: (value: TextMoodState) => void
  readonly setStatusMessage: (value: string) => void
}

const createHarness = (): MoodHarness => {
  const [canAnalyze, setCanAnalyze] = createSignal(true)
  const [isBusy, setBusy] = createSignal(false)
  const [progress, setProgress] = createSignal(0)
  const [state, setState] = createSignal<TextMoodState>({status: 'idle'})
  const [statusMessage, setStatusMessage] = createSignal('모델을 준비해요.')
  const [text, setText] = createSignal('초기 문장')
  const controller: TextMoodController = {
    analyze: vi.fn().mockResolvedValue(undefined),
    canAnalyze,
    isBusy,
    prepare: vi.fn().mockResolvedValue(undefined),
    progress,
    setText: vi.fn(setText),
    state,
    statusMessage,
    text,
  }

  return {
    controller,
    setBusy,
    setCanAnalyze,
    setProgress,
    setState,
    setStatusMessage,
  }
}

const renderLab = (harness: MoodHarness) => {
  vi.mocked(useTextMood).mockReturnValue(harness.controller)
  return render(() => <TextMoodLab />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(TextMoodAnalysisResult).mockImplementation(
    (props: Parameters<typeof TextMoodAnalysisResult>[0]) => (
      <div data-primary={props.analysis.primary.id} data-testid="analysis-result" />
    ),
  )
  vi.mocked(TextMoodInsufficientResult).mockImplementation(() => (
    <div data-testid="insufficient-result" />
  ))
  vi.mocked(TextMoodEvaluation).mockImplementation(() => <div data-testid="evaluation" />)
})

describe('TextMoodLab', () => {
  it('should wire initial text, direct input, samples, and actions', () => {
    const harness = createHarness()
    renderLab(harness)

    expect(useTextMood).toHaveBeenCalledWith({
      initialText: '창문을 여니 시원한 바람이 불어왔다. 오늘은 좋은 일이 생길 것 같다.',
    })
    expect(screen.getByRole('heading', {name: '문장의 분위기를 열두 갈래로 읽어요'})).toBeVisible()
    expect(screen.getByRole('textbox', {name: '분석할 문장'})).toHaveValue('초기 문장')
    expect(screen.getByTestId('evaluation')).toBeInTheDocument()
    expect(screen.queryByTestId('analysis-result')).not.toBeInTheDocument()
    expect(screen.queryByTestId('insufficient-result')).not.toBeInTheDocument()

    fireEvent.input(screen.getByRole('textbox', {name: '분석할 문장'}), {
      target: {value: '직접 입력한 문장'},
    })
    expect(harness.controller.setText).toHaveBeenCalledWith('직접 입력한 문장')

    for (const position of [1, 2, 3, 4]) {
      fireEvent.click(screen.getByRole('button', {name: `예시 ${position}`}))
    }
    expect(harness.controller.setText).toHaveBeenCalledTimes(5)
    expect(harness.controller.setText).toHaveBeenLastCalledWith(
      '회의는 오후 두 시에 시작하며 참석자는 회의실로 모이면 된다.',
    )

    fireEvent.click(screen.getByRole('button', {name: '분위기 분석하기'}))
    fireEvent.click(screen.getByRole('button', {name: '모델만 미리 준비'}))
    expect(harness.controller.analyze).toHaveBeenCalledOnce()
    expect(harness.controller.prepare).toHaveBeenCalledOnce()
  })

  it('should react to disabled, loading, error, complete, and insufficient states', async () => {
    const harness = createHarness()
    renderLab(harness)
    const analyzeButton = screen.getByRole('button', {name: '분위기 분석하기'})
    const prepareButton = screen.getByRole('button', {name: '모델만 미리 준비'})

    harness.setCanAnalyze(false)
    harness.setBusy(true)
    await waitFor(() => {
      expect(analyzeButton).toBeDisabled()
      expect(prepareButton).toBeDisabled()
    })

    harness.setProgress(42)
    harness.setStatusMessage('준비 중')
    harness.setState({progress: 42, status: 'loading'})
    await waitFor(() => {
      expect(screen.getByRole('progressbar', {name: '모델 42% 준비됨'})).toHaveAttribute(
        'aria-valuenow',
        '42',
      )
      expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({width: '42%'})
      expect(screen.getByText('준비 중')).toBeInTheDocument()
    })

    harness.setState({message: '분석 실패', status: 'error'})
    harness.setStatusMessage('분석 실패')
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('분석 실패')).toHaveClass('text-#ffb0bb')
    })

    harness.setState({
      analysis: {primary: {id: 'calm'}} as never,
      elapsedMilliseconds: 12,
      status: 'complete',
    })
    await waitFor(() =>
      expect(screen.getByTestId('analysis-result')).toHaveAttribute('data-primary', 'calm'),
    )

    harness.setState({status: 'insufficient'})
    await waitFor(() => {
      expect(screen.queryByTestId('analysis-result')).not.toBeInTheDocument()
      expect(screen.getByTestId('insufficient-result')).toBeInTheDocument()
    })
  })
})
