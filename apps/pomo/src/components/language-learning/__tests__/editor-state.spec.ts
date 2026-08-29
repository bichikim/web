import {expect, it, vi} from 'vitest'

import {
  isLanguageLearningEditorBusy,
  type LanguageLearningEditorWorkflow,
  queueLanguageLearningEditorTask,
} from '../editor-state'

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
