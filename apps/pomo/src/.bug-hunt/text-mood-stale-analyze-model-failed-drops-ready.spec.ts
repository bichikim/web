/** @vitest-environment jsdom */
import {createDeferred} from 'src/test-utils/create-deferred'
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {failureResult, successResult} from 'src/features/result'
import type {TextMoodAnalyzer} from 'src/features/text-mood/client'
import {type TextMoodRuntime, useTextMood} from 'src/features/text-mood'

vi.mock('src/features/text-mood/client', () => ({createTextMoodAnalyzer: vi.fn()}))

import {createTextMoodAnalyzer} from 'src/features/text-mood/client'

afterEach(() => {
  vi.clearAllMocks()
})

it('should stay ready when a stale analysis fails with a non-classification worker error after prepare', async () => {
  const analysisResult = createDeferred<Awaited<ReturnType<TextMoodAnalyzer['analyze']>>>()
  const analyzer: TextMoodAnalyzer = {
    analyze: vi.fn(() => analysisResult.promise),
    dispose: vi.fn(),
    prepare: vi.fn(async () =>
      successResult({repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'}),
    ),
  }
  const runtime: TextMoodRuntime = {
    createAnalyzer: vi.fn(() => analyzer),
  }
  vi.mocked(createTextMoodAnalyzer).mockImplementation(runtime.createAnalyzer)

  const root = createRoot((dispose) => {
    const controller = useTextMood({initialText: '첫 문장', runtime})
    return {controller, dispose}
  })

  await root.controller.prepare()
  expect(root.controller.state()).toEqual({status: 'ready'})

  const analysis = root.controller.analyze()
  root.controller.setText('바뀐 문장')
  analysisResult.resolve(
    failureResult({
      code: 'model-failed',
      detail: 'Worker 연결 끊김',
      phase: 'analyze',
      retryable: true,
    }),
  )
  await analysis

  expect(root.controller.state()).toEqual({status: 'ready'})
  root.dispose()
})
