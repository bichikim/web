/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type TextMoodAnalysis,
  type TextMoodAnalyzer,
  type TextMoodController,
  type TextMoodRuntime,
  useTextMood,
} from '../index'
import {failureResult, successResult} from '../../result'

const clientMocks = vi.hoisted(() => ({createAnalyzer: vi.fn()}))

vi.mock('../client', () => ({createTextMoodAnalyzer: clientMocks.createAnalyzer}))

const ANALYSIS: TextMoodAnalysis = {
  margin: 0.5,
  modifiers: [],
  primary: {id: 'hopeful', probability: 0.75},
  scores: [
    {id: 'hopeful', probability: 0.75},
    {id: 'cheerful', probability: 0.25},
  ],
  secondary: null,
  uncertain: false,
}

const createDeferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })
  return {promise, resolve}
}

interface TextMoodTestRoot {
  readonly controller: TextMoodController
  readonly dispose: () => void
}

interface TestRuntime extends TextMoodRuntime {
  readonly analyzer: TextMoodAnalyzer
  readonly reportProgress: (progress: number) => void
}

const createRuntime = (): TestRuntime => {
  let onProgress: ((progress: number) => void) | null = null
  const analyzer: TextMoodAnalyzer = {
    analyze: vi.fn(async () =>
      successResult({analysis: ANALYSIS, elapsedMilliseconds: 18, status: 'complete' as const}),
    ),
    dispose: vi.fn(),
    prepare: vi.fn(async () =>
      successResult({repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'}),
    ),
  }

  return {
    analyzer,
    createAnalyzer: vi.fn((options) => {
      onProgress = options.onProgress ?? null
      return analyzer
    }),
    reportProgress: (progress) => onProgress?.(progress),
  }
}

const createTextMoodRoot = (runtime: TextMoodRuntime): TextMoodTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useTextMood({initialText: '  좋은 일이 생길 것 같아.  ', runtime})
  })
  return {controller, dispose: disposeRoot}
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTextMood', () => {
  it('should use empty text and the default analyzer when props are omitted', () => {
    const runtime = createRuntime()
    clientMocks.createAnalyzer.mockReturnValue(runtime.analyzer)
    let disposeRoot: () => void = () => undefined
    const controller = createRoot((dispose) => {
      disposeRoot = dispose
      return useTextMood()
    })

    expect(controller.text()).toBe('')
    expect(controller.canAnalyze()).toBe(false)
    expect(controller.state()).toEqual({status: 'idle'})
    expect(clientMocks.createAnalyzer).toHaveBeenCalledOnce()

    disposeRoot()
    expect(runtime.analyzer.dispose).toHaveBeenCalledOnce()
  })

  it('should prepare the model and expose progress', async () => {
    const runtime = createRuntime()
    const root = createTextMoodRoot(runtime)
    const preparation = root.controller.prepare()

    runtime.reportProgress(48)
    expect(root.controller.state()).toEqual({progress: 48, status: 'loading'})
    await preparation
    expect(root.controller.state()).toEqual({status: 'ready'})
    expect(root.controller.statusMessage()).toContain('모델이 준비됐어요')
    root.dispose()
  })

  it('should ignore another prepare request while the model is loading', async () => {
    const runtime = createRuntime()
    const preparation = createDeferred<Awaited<ReturnType<TextMoodAnalyzer['prepare']>>>()
    vi.mocked(runtime.analyzer.prepare).mockReturnValueOnce(preparation.promise)
    const root = createTextMoodRoot(runtime)

    const firstPreparation = root.controller.prepare()
    await root.controller.prepare()

    expect(runtime.analyzer.prepare).toHaveBeenCalledOnce()
    expect(root.controller.isBusy()).toBe(true)
    preparation.resolve(
      successResult({repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'}),
    )
    await firstPreparation
    expect(root.controller.state()).toEqual({status: 'ready'})
    root.dispose()
  })

  it('should analyze trimmed text and expose the complete result', async () => {
    const runtime = createRuntime()
    const root = createTextMoodRoot(runtime)

    await root.controller.analyze()

    expect(runtime.analyzer.analyze).toHaveBeenCalledWith({text: '좋은 일이 생길 것 같아.'})
    expect(root.controller.state()).toEqual({
      analysis: ANALYSIS,
      elapsedMilliseconds: 18,
      status: 'complete',
    })
    expect(root.controller.statusMessage()).toContain('18ms')
    root.dispose()
    expect(runtime.analyzer.dispose).toHaveBeenCalledOnce()
  })

  it('should block empty input and translate expected failures', async () => {
    const runtime = createRuntime()
    vi.mocked(runtime.analyzer.prepare).mockResolvedValueOnce(
      failureResult({code: 'model-failed', phase: 'prepare', retryable: true}),
    )
    const root = createTextMoodRoot(runtime)

    root.controller.setText('   ')
    await root.controller.analyze()
    expect(runtime.analyzer.analyze).not.toHaveBeenCalled()

    await root.controller.prepare()
    expect(root.controller.state()).toEqual({
      message: '분위기 분석 모델을 준비하지 못했어요.',
      status: 'error',
    })
    root.dispose()
  })

  it('should expose insufficiency returned by the learned model gate', async () => {
    const runtime = createRuntime()
    vi.mocked(runtime.analyzer.analyze).mockResolvedValueOnce(
      successResult({
        elapsedMilliseconds: 17,
        status: 'insufficient',
        sufficiency: {insufficient: true, probability: 0.97, threshold: 0.94},
      }),
    )
    const root = createTextMoodRoot(runtime)

    root.controller.setText('뚜두둥')
    await root.controller.analyze()

    expect(runtime.analyzer.analyze).toHaveBeenCalledWith({text: '뚜두둥'})
    expect(root.controller.state()).toEqual({status: 'insufficient'})
    expect(root.controller.statusMessage()).toContain('단서가 부족해요')

    root.controller.setText('무서워')
    expect(root.controller.state()).toEqual({status: 'idle'})
    await root.controller.analyze()
    expect(runtime.analyzer.analyze).toHaveBeenCalledWith({text: '무서워'})
    root.dispose()
  })

  it('should expose an analysis failure and reset it when text changes', async () => {
    const runtime = createRuntime()
    vi.mocked(runtime.analyzer.analyze).mockResolvedValueOnce(
      failureResult({
        code: 'classification-failed',
        detail: '분석 실패',
        phase: 'analyze',
        retryable: true,
      }),
    )
    const root = createTextMoodRoot(runtime)

    await root.controller.analyze()

    expect(root.controller.state()).toEqual({message: '분석 실패', status: 'error'})
    expect(root.controller.statusMessage()).toBe('분석 실패')

    root.controller.setText('다시 분석할 문장')
    expect(root.controller.state()).toEqual({status: 'idle'})
    root.dispose()
  })

  it('should discard an analysis result when the input changes before it completes', async () => {
    const runtime = createRuntime()
    let resolveAnalysis: (result: Awaited<ReturnType<TextMoodAnalyzer['analyze']>>) => void = () =>
      undefined
    vi.mocked(runtime.analyzer.analyze).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve
        }),
    )
    const root = createTextMoodRoot(runtime)
    const analysis = root.controller.analyze()

    root.controller.setText('입력을 바꿨어요.')
    resolveAnalysis(
      successResult({analysis: ANALYSIS, elapsedMilliseconds: 18, status: 'complete'}),
    )
    await analysis

    expect(root.controller.state()).toEqual({status: 'idle'})
    expect(root.controller.text()).toBe('입력을 바꿨어요.')
    root.dispose()
  })
})
