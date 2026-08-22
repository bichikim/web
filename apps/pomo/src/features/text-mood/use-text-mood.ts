import {type Accessor, createMemo, createSignal, onCleanup, untrack} from 'solid-js'

import type {TextMoodAnalysis} from './analysis'
import {
  createTextMoodAnalyzer,
  type CreateTextMoodAnalyzerOptions,
  type TextMoodAnalyzer,
} from './client'
import {getTextMoodErrorMessage} from './errors'

interface IdleState {
  readonly status: 'idle'
}

interface LoadingState {
  readonly progress: number
  readonly status: 'loading'
}

interface ReadyState {
  readonly status: 'ready'
}

interface AnalyzingState {
  readonly status: 'analyzing'
}

interface InsufficientState {
  readonly status: 'insufficient'
}

interface CompleteState {
  readonly analysis: TextMoodAnalysis
  readonly elapsedMilliseconds: number
  readonly status: 'complete'
}

interface ErrorState {
  readonly message: string
  readonly status: 'error'
}

export type TextMoodState =
  | AnalyzingState
  | CompleteState
  | ErrorState
  | IdleState
  | InsufficientState
  | LoadingState
  | ReadyState

export interface TextMoodRuntime {
  readonly createAnalyzer: (options: CreateTextMoodAnalyzerOptions) => TextMoodAnalyzer
}

export interface UseTextMoodProps {
  readonly initialText?: string
  readonly runtime?: TextMoodRuntime
}

export interface TextMoodController {
  readonly analyze: () => Promise<void>
  readonly canAnalyze: Accessor<boolean>
  readonly isBusy: Accessor<boolean>
  readonly prepare: () => Promise<void>
  readonly progress: Accessor<number>
  readonly setText: (text: string) => void
  readonly state: Accessor<TextMoodState>
  readonly statusMessage: Accessor<string>
  readonly text: Accessor<string>
}

const DEFAULT_RUNTIME: TextMoodRuntime = {createAnalyzer: createTextMoodAnalyzer}

export const useTextMood = (props: UseTextMoodProps = {}): TextMoodController => {
  const initialText = untrack(() => props.initialText ?? '')
  const runtime = untrack(() => props.runtime ?? DEFAULT_RUNTIME)
  const [text, setText] = createSignal(initialText)
  const [state, setState] = createSignal<TextMoodState>({status: 'idle'})
  let analysisVersion = 0
  const analyzer = runtime.createAnalyzer({
    onProgress: (progress) => setState({progress, status: 'loading'}),
  })
  const isBusy = createMemo(() => {
    const {status} = state()
    return status === 'analyzing' || status === 'loading'
  })
  const canAnalyze = createMemo(() => !isBusy() && text().trim().length > 0)
  const progress = createMemo(() => {
    const currentState = state()
    return currentState.status === 'loading' ? currentState.progress : 0
  })
  const statusMessage = createMemo(() => {
    const currentState = state()

    switch (currentState.status) {
      case 'analyzing':
        return '문장의 의미를 읽고 분위기를 비교하고 있어요…'
      case 'complete':
        return `${Math.round(currentState.elapsedMilliseconds)}ms 만에 분석했어요.`
      case 'error':
        return currentState.message
      case 'idle':
        return '처음 분석할 때 모델을 내려받아 보관해요.'
      case 'insufficient':
        return '분위기를 판단할 단서가 부족해요. 짧은 상황을 함께 적어 주세요.'
      case 'loading':
        return `MiniLM 모델 준비 중 · ${currentState.progress}%`
      case 'ready':
        return '모델이 준비됐어요. 문장을 입력해 분석해 보세요.'
    }

    currentState satisfies never
  })

  const prepare = async () => {
    if (isBusy()) {
      return
    }

    setState({progress: 0, status: 'loading'})
    const result = await analyzer.prepare()
    setState(
      result.ok
        ? {status: 'ready'}
        : {message: getTextMoodErrorMessage(result.error), status: 'error'},
    )
  }

  const analyze = async () => {
    if (!canAnalyze()) {
      return
    }

    const analyzedText = text().trim()
    analysisVersion += 1
    const requestVersion = analysisVersion
    setState({status: 'analyzing'})
    const result = await analyzer.analyze({text: analyzedText})

    if (requestVersion !== analysisVersion) {
      setState({status: 'idle'})
      return
    }

    if (result.ok) {
      if (result.value.status === 'insufficient') {
        setState({status: 'insufficient'})
        return
      }

      setState({
        analysis: result.value.analysis,
        elapsedMilliseconds: result.value.elapsedMilliseconds,
        status: 'complete',
      })
      return
    }

    setState({message: getTextMoodErrorMessage(result.error), status: 'error'})
  }

  onCleanup(() => {
    analysisVersion += 1
    analyzer.dispose()
  })

  const updateText = (nextText: string) => {
    analysisVersion += 1
    setText(nextText)

    const {status} = state()

    if (status === 'complete' || status === 'error' || status === 'insufficient') {
      setState({status: 'idle'})
    }
  }

  return {
    analyze,
    canAnalyze,
    isBusy,
    prepare,
    progress,
    setText: updateText,
    state,
    statusMessage,
    text,
  }
}
