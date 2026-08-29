import {expect, it, vi} from 'vitest'

import {
  getLanguageLearningGenerationStatus,
  isLanguageLearningEditorBusy,
  type LanguageLearningEditorWorkflow,
  queueLanguageLearningEditorTask,
} from '../editor-state'

it('should show matching text and voice model download progress', () => {
  expect(
    getLanguageLearningGenerationStatus({
      downloadState: {
        label: 'Gemma 4 E2B',
        percentage: 37,
        status: 'loading',
        target: {kind: 'text', modelId: 'gemma-4-e2b'},
      },
      message: 'idle',
      phase: 'idle',
    }),
  ).toEqual({
    kind: 'draft',
    message: 'Gemma 4 E2B 모델 받는 중 · 37%',
    progress: 37,
    progressLabel: '모델 다운로드 진행률',
  })

  expect(
    getLanguageLearningGenerationStatus({
      downloadState: {
        label: 'Full 음성',
        percentage: 61,
        status: 'loading',
        target: {kind: 'voice', modelId: 'full'},
      },
      message: 'idle',
      phase: 'text',
    }),
  ).toMatchObject({kind: 'voice', message: 'Full 음성 모델 받는 중 · 61%', progress: 61})
})

it('should preserve the editor status outside model downloads', () => {
  expect(
    getLanguageLearningGenerationStatus({
      downloadState: {status: 'idle'},
      message: '음성을 만들고 있어요.',
      phase: 'voice',
    }),
  ).toEqual({
    kind: 'voice',
    message: '음성을 만들고 있어요.',
    progress: null,
    progressLabel: '음성을 만들고 있어요.',
  })
})

it('should report every busy editor state', () => {
  expect(isLanguageLearningEditorBusy('text', null)).toBe(true)
  expect(isLanguageLearningEditorBusy('voice', null)).toBe(true)
  expect(isLanguageLearningEditorBusy('saving', null)).toBe(true)
  expect(isLanguageLearningEditorBusy('review', 'candidate-1')).toBe(true)
  expect(isLanguageLearningEditorBusy('idle', null)).toBe(false)
})

it('should run a queued task while the editor is active', async () => {
  const callback = vi.fn()
  const workflow: LanguageLearningEditorWorkflow = {
    handledOutput: false,
    isDisposed: false,
    retryCount: 0,
  }

  queueLanguageLearningEditorTask(workflow, callback)
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })

  expect(callback).toHaveBeenCalledExactlyOnceWith()
})

it('should discard a queued task after the editor is disposed', async () => {
  const callback = vi.fn()
  const workflow: LanguageLearningEditorWorkflow = {
    handledOutput: false,
    isDisposed: false,
    retryCount: 0,
  }

  queueLanguageLearningEditorTask(workflow, callback)
  workflow.isDisposed = true
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })

  expect(callback).not.toHaveBeenCalled()
})
