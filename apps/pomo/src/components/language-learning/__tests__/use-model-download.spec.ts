import {createSignal} from 'solid-js'
import {expect, it, type Mock, vi} from 'vitest'

import type {ModelDownloadResult} from '../../../features/model-download'
import type {LanguageLearningPendingDownload} from '../editor-state'
import type {LanguageLearningEditorState} from '../use-editor-state'
import {useModelDownload} from '../use-model-download'

function createDeferred<T>() {
  let resolve = (_value: T) => undefined
  const promise = new Promise<T>((nextResolve) => {
    resolve = (value) => {
      nextResolve(value)
    }
  })

  return {promise, resolve}
}

interface DownloadTestContext {
  readonly beginTextGeneration: Mock<() => void>
  readonly controller: ReturnType<typeof useModelDownload>
  readonly generateCandidateVoice: Mock<(candidateId: string) => Promise<void>>
  readonly generateVoices: Mock<() => Promise<void>>
  readonly result: ReturnType<typeof createDeferred<ModelDownloadResult>>
  readonly setPendingDownload: (target: LanguageLearningPendingDownload) => void
}

const createDownloadTestContext = (): DownloadTestContext => {
  const result = createDeferred<ModelDownloadResult>()
  const [pendingDownload, setPendingDownload] = createSignal<LanguageLearningPendingDownload>(null)
  const beginTextGeneration = vi.fn()
  const generateCandidateVoice = vi.fn().mockResolvedValue(undefined)
  const generateVoices = vi.fn().mockResolvedValue(undefined)
  const state = {
    downloadContinuationActive: () => false,
    fail: vi.fn(),
    modelDownload: {
      startTextModel: vi.fn(() => result.promise),
      startVoiceModel: vi.fn(() => result.promise),
    },
    modelId: () => 'full',
    pendingDownload,
    setDownloadContinuationActive: vi.fn(),
    setMessage: vi.fn(),
    setPendingDownload,
    setPhase: vi.fn(),
    setRegeneratingCandidateId: vi.fn(),
    workflow: {isDisposed: false},
  } as unknown as LanguageLearningEditorState

  return {
    beginTextGeneration,
    controller: useModelDownload({
      beginTextGeneration,
      generateCandidateVoice,
      generateVoices,
      state,
    }),
    generateCandidateVoice,
    generateVoices,
    result,
    setPendingDownload,
  }
}

it('should continue text generation once when the shared download is requested again', async () => {
  const context = createDownloadTestContext()
  const target = {kind: 'text'} as const
  context.setPendingDownload(target)
  const first = context.controller.handleDownloadConfirm()
  context.setPendingDownload(target)
  const second = context.controller.handleDownloadConfirm()

  context.result.resolve({status: 'complete'})
  await Promise.all([first, second])

  expect(context.beginTextGeneration).toHaveBeenCalledOnce()
})

it('should continue all-sentence voice generation once when the shared download is requested again', async () => {
  const context = createDownloadTestContext()
  const target = {kind: 'voice-all'} as const
  context.setPendingDownload(target)
  const first = context.controller.handleDownloadConfirm()
  context.setPendingDownload(target)
  const second = context.controller.handleDownloadConfirm()

  context.result.resolve({status: 'complete'})
  await Promise.all([first, second])

  expect(context.generateVoices).toHaveBeenCalledOnce()
})

it('should continue candidate voice generation once when the shared download is requested again', async () => {
  const context = createDownloadTestContext()
  const target = {candidateId: 'candidate-id', kind: 'voice-candidate'} as const
  context.setPendingDownload(target)
  const first = context.controller.handleDownloadConfirm()
  context.setPendingDownload(target)
  const second = context.controller.handleDownloadConfirm()

  context.result.resolve({status: 'complete'})
  await Promise.all([first, second])

  expect(context.generateCandidateVoice).toHaveBeenCalledExactlyOnceWith('candidate-id')
})
