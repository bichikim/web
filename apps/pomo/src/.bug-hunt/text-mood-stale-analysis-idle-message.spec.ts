/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {failureResult, successResult} from 'src/features/result'
import type {TextMoodAnalysis, TextMoodAnalyzer, TextMoodController} from '../features/text-mood'
import {useTextMood} from '../features/text-mood/use-text-mood'

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

afterEach(() => {
  vi.restoreAllMocks()
})

it('should keep the ready status message after a stale analysis is cancelled by editing', async () => {
  const analyzeDeferred = createDeferred<
    ReturnType<TextMoodAnalyzer['analyze']> extends Promise<infer Result> ? Result : never
  >()
  const analyzer: TextMoodAnalyzer = {
    analyze: vi.fn(() => analyzeDeferred.promise),
    dispose: vi.fn(),
    prepare: vi.fn(async () =>
      successResult({repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'}),
    ),
  }
  let controller!: TextMoodController
  const dispose = createRoot((disposeRoot) => {
    controller = useTextMood({
      initialText: '처음 문장',
      runtime: {createAnalyzer: () => analyzer},
    })
    return disposeRoot
  })

  await controller.prepare()
  const analysis = controller.analyze()
  controller.setText('입력을 바꿨어요.')
  analyzeDeferred.resolve(
    successResult({analysis: ANALYSIS, elapsedMilliseconds: 18, status: 'complete'}),
  )
  await analysis

  expect(controller.state()).toEqual({status: 'idle'})
  expect(controller.statusMessage()).toBe('모델이 준비됐어요. 문장을 입력해 분석해 보세요.')

  dispose()
})
